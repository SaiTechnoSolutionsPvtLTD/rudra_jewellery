import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { handleDecimalKeyDown, sanitizeDecimal } from '../../utils/numberInputUtils';
import { cleanProductName } from '../../utils/formatters';

export default function WorkInProgress() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast, showConfirm } = useToast();
  const { isKarigar } = useAuth();

  // Query parameter order_id
  const queryParams = new URLSearchParams(location.search);
  const queryOrderId = queryParams.get('order_id');

  const [orders, setOrders] = useState([]);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(queryOrderId || null);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Karigar work progress editable form state
  const [formStatus, setFormStatus] = useState('in_progress');
  const [formCompletedNow, setFormCompletedNow] = useState(1);
  const [formCompletedWeight, setFormCompletedWeight] = useState('');
  const [formActualWeight, setFormActualWeight] = useState('');
  const [formOldWeight, setFormOldWeight] = useState('');
  const [formNewGoldWeight, setFormNewGoldWeight] = useState('');
  const [formPurity, setFormPurity] = useState('91.6% (22K)');
  const [formColorStoneWeight, setFormColorStoneWeight] = useState('');
  const [formSilverWeight, setFormSilverWeight] = useState('');
  const [formDiamondWeight, setFormDiamondWeight] = useState('');
  const [formDiamondCount, setFormDiamondCount] = useState('');
  const [formExpectedDate, setFormExpectedDate] = useState('2024-04-28');
  const [formRemarks, setFormRemarks] = useState('');
  const [formIsDelayed, setFormIsDelayed] = useState(false);
  const [formDelayDays, setFormDelayDays] = useState(0);
  const [formDelayReason, setFormDelayReason] = useState('');
  const [formDelayRemarks, setFormDelayRemarks] = useState('');
  const [showDelayReasonInput, setShowDelayReasonInput] = useState(false);

  // Real Pagination for Timeline table
  const [timelinePage, setTimelinePage] = useState(1);
  const timelinesPerPage = 5;

  // Formatter helpers
  const formatWeight = (val, fallback = '0.000') => {
    if (val === undefined || val === null || val === '') return fallback;
    const num = parseFloat(val);
    if (isNaN(num)) return fallback;
    return num.toFixed(3);
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '24/04/2024';
    const s = String(dateStr).trim();
    if (s.includes('-')) {
      const parts = s.split('T')[0].split('-');
      if (parts[0].length === 4) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    return s;
  };

  const formatTimelineDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = d.getDate();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${day} ${month} ${year}, ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
    } catch {
      return dateStr;
    }
  };

  // Fetch all orders for switcher & locating current job
  const fetchOrdersList = useCallback(async () => {
    try {
      const res = await api.get('/work-orders', { params: { tab: 'ongoing' } });
      const list = res.data.data || [];
      setOrders(list);
      return list;
    } catch (err) {
      console.warn('Failed to load orders list:', err);
      return [];
    }
  }, []);

  // Fetch single work order with timelines, client, karigar, product
  const fetchOrderDetails = useCallback(async (id, isSilent = false) => {
    if (!id) return;
    try {
      if (!isSilent) setLoading(true);
      const res = await api.get(`/work-orders/${id}`);
      const o = res.data.data;
      setCurrentOrder(o);
      setSelectedOrderId(o.id);
      if (o?.items && o.items.length > 0) {
        setSelectedJobId((prev) => (prev && o.items.some(it => it.id === prev) ? prev : o.items[0].id));
      }
    } catch (err) {
      console.error('Failed to load work order:', err);
      if (!isSilent) showToast?.('Failed to load work order details', 'error');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [showToast]);

  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [inlineModalRow, setInlineModalRow] = useState(null);
  const [inlineCompletedNow, setInlineCompletedNow] = useState(1);
  const [inlineActualWeight, setInlineActualWeight] = useState('');
  const [inlineConsumedWeight, setInlineConsumedWeight] = useState('');
  const [inlineStoneWeight, setInlineStoneWeight] = useState('');
  const [inlineRecoveredWeight, setInlineRecoveredWeight] = useState('');
  const [inlineProcessLoss, setInlineProcessLoss] = useState('');
  const [inlineProdStatus, setInlineProdStatus] = useState('in_progress');
  const [inlineRemarks, setInlineRemarks] = useState('');

  // Operation Modal State
  const [opModalRow, setOpModalRow] = useState(null);
  const [opName, setOpName] = useState('Casting');
  const [opStatus, setOpStatus] = useState('in_progress');
  const [opProcessedQty, setOpProcessedQty] = useState(1);
  const [opWeight, setOpWeight] = useState('');
  const [opStaff, setOpStaff] = useState('');
  const [opRemarks, setOpRemarks] = useState('');
  const [opList, setOpList] = useState([]);
  const [operationsMasterList, setOperationsMasterList] = useState([]);

  // Fetch Operations Master dynamically
  const fetchOperationsMaster = useCallback(async () => {
    try {
      const res = await api.get('/operations');
      const ops = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      const activeOps = ops.filter((op) => op.status !== 'inactive');
      setOperationsMasterList(activeOps);
      return activeOps;
    } catch (err) {
      console.warn('Failed to load operations master:', err);
      return [];
    }
  }, []);

  // History Modal State
  const [historyModalRow, setHistoryModalRow] = useState(null);
  const [historyTimeline, setHistoryTimeline] = useState([]);

  const searchTermLower = searchTerm.toLowerCase().trim();

  // Flatten every product item in active WIP orders into individual rows
  const allWipItems = React.useMemo(() => {
    const rows = [];
    orders.forEach((wo) => {
      const matchesSearch = (itemProd = '', itemDesign = '') => {
        if (!searchTermLower) return true;
        const woNum = String(wo.work_order_number || wo.job_number || '').toLowerCase();
        const prod = String(itemProd || wo.product_name || wo.item_type || '').toLowerCase();
        const kar = String(wo.karigar_name || wo.artisan_name || '').toLowerCase();
        const des = String(itemDesign || wo.design_code || '').toLowerCase();
        return woNum.includes(searchTermLower) || prod.includes(searchTermLower) || kar.includes(searchTermLower) || des.includes(searchTermLower);
      };

      if (wo.items && wo.items.length > 0) {
        wo.items.forEach((item, idx) => {
          if (!matchesSearch(item.product_name, item.design_no)) return;
          const reqQty = Number(item.required_qty || 1);
          const compQty = Number(item.completed_qty || 0);
          const reworkQty = Number(item.rework_qty || 0) || (item.status === 'rework' ? 1 : 0);
          const pendQty = Math.max(0, reqQty - compQty);
          const totalInProcess = pendQty + reworkQty;

          rows.push({
            rowKey: `wo_${wo.id}_item_${item.id}`,
            orderId: wo.id,
            itemId: item.id,
            productNo: `#${idx + 1}`,
            work_order: wo,
            item: item,
            work_order_number: wo.work_order_number,
            job_order_number: wo.job_order?.job_order_number || wo.job_number || null,
            product_name: item.product_name || wo.product_name || 'Jewelry Piece',
            design_no: item.design_no || wo.design_code || '—',
            karat: wo.karat || item.karat || '22K',
            artisan_name: wo.karigar?.name || wo.karigar_name || 'In-House Artisan',
            client_name: wo.client?.name || wo.customer_name || '—',
            delivery_date: wo.delivery_date,
            allotted_weight: Number(item.allotted_weight || wo.allotted_weight || 0),
            completed_weight: Number(item.completed_weight || wo.completed_weight || 0),
            required_qty: reqQty,
            completed_qty: compQty,
            pending_qty: pendQty,
            rework_qty: reworkQty,
            total_in_process: totalInProcess,
            return_reason: item.return_reason || wo.return_reason || null,
            qc_pending_qty: Number(item.qc_pending_qty || (['quality_check', 'pending_approval', 'ready_for_qc'].includes(item.status) || ['quality_check', 'pending_approval'].includes(wo.current_stage) || wo.status === 'pending_approval' ? (wo.qc_pending_qty || compQty || reqQty || 1) : 0)),
            status: item.status || wo.status || 'in_progress',
            current_stage: wo.current_stage || 'in_progress',
            is_delayed: Boolean(wo.is_delayed || wo.status === 'delayed'),
            delay_days: wo.delay_days || 0,
            thumbnail: wo.reference_image || wo.image_url || wo.design_image || null,
          });
        });
      } else {
        if (!matchesSearch(wo.product_name, wo.design_code)) return;
        const reqQty = Number(wo.required_qty || 1);
        const compQty = Number(wo.completed_qty || 0);
        const reworkQty = Number(wo.rework_qty || 0) || (wo.status === 'returned' || wo.current_stage === 'rework' ? 1 : 0);
        const pendQty = Math.max(0, reqQty - compQty);
        const totalInProcess = pendQty + reworkQty;

        rows.push({
          rowKey: `wo_${wo.id}_root`,
          orderId: wo.id,
          itemId: null,
          productNo: '#1',
          work_order: wo,
          item: null,
          work_order_number: wo.work_order_number,
          job_order_number: wo.job_order?.job_order_number || wo.job_number || null,
          product_name: wo.product_name || 'Jewelry Piece',
          design_no: wo.design_code || '—',
          karat: wo.karat || '22K',
          artisan_name: wo.karigar?.name || wo.karigar_name || 'In-House Artisan',
          client_name: wo.client?.name || wo.customer_name || '—',
          delivery_date: wo.delivery_date,
          allotted_weight: Number(wo.allotted_weight || 0),
          completed_weight: Number(wo.completed_weight || 0),
          required_qty: reqQty,
          completed_qty: compQty,
          pending_qty: pendQty,
          rework_qty: reworkQty,
          total_in_process: totalInProcess,
          return_reason: wo.return_reason || null,
          qc_pending_qty: Number(wo.qc_pending_qty || (['quality_check', 'pending_approval', 'ready_for_qc'].includes(wo.current_stage) || wo.status === 'pending_approval' ? (compQty || reqQty || 1) : 0)),
          status: wo.status || 'in_progress',
          current_stage: wo.current_stage || 'in_progress',
          is_delayed: Boolean(wo.is_delayed || wo.status === 'delayed'),
          delay_days: wo.delay_days || 0,
          thumbnail: wo.reference_image || wo.image_url || wo.design_image || null,
        });
      }
    });
    return rows;
  }, [orders, searchTermLower]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalWipItems = allWipItems.length;
  const totalPages = Math.max(1, Math.ceil(totalWipItems / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const paginatedWipItems = allWipItems.slice(startIndex, startIndex + itemsPerPage);

  const toggleSelectRow = (rowKey) => {
    setSelectedRowKeys((prev) =>
      prev.includes(rowKey) ? prev.filter((k) => k !== rowKey) : [...prev, rowKey]
    );
  };

  const toggleSelectAll = () => {
    const paginatedKeys = paginatedWipItems.map((r) => r.rowKey);
    const allSelected = paginatedKeys.every((k) => selectedRowKeys.includes(k));
    if (allSelected) {
      setSelectedRowKeys((prev) => prev.filter((k) => !paginatedKeys.includes(k)));
    } else {
      setSelectedRowKeys((prev) => Array.from(new Set([...prev, ...paginatedKeys])));
    }
  };

  const handleBatchSubmitQc = async () => {
    const selectedRows = allWipItems.filter((r) => selectedRowKeys.includes(r.rowKey));
    if (selectedRows.length === 0) {
      showToast?.('Please select at least one product row to submit to Quality Check.', 'warning');
      return;
    }

    const confirmed = await showConfirm({
      title: 'Send Selected Products to Quality Check',
      message: `Submit ${selectedRows.length} selected product item(s) to Quality Check? Submitted items will enter the QC inspection queue.`,
      icon: 'fa-solid fa-paper-plane',
      confirmText: `Submit ${selectedRows.length} Item(s) to QC`,
    });
    if (!confirmed) return;

    try {
      setActionLoading(true);
      const itemsPayload = selectedRows.map((r) => ({
        work_order_id: r.orderId,
        work_order_item_id: r.itemId,
        completed_now: 1,
        actual_weight: r.completed_weight > 0 ? r.completed_weight : r.allotted_weight,
        remarks: `Submitted ${r.product_name} (${r.productNo}) to Quality Check`,
      }));

      const res = await api.post('/work-orders/batch-submit-qc', { items: itemsPayload });
      showToast?.(res.data?.message || `${selectedRows.length} product(s) successfully submitted to Quality Check!`, 'success');
      setSelectedRowKeys([]);
      fetchOrdersList();
    } catch (err) {
      showToast?.(err.response?.data?.message || 'Failed to submit selected items to QC.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const openInlineProductionModal = (row) => {
    setInlineModalRow(row);
    const maxAvail = (row.total_in_process || (row.pending_qty + (row.rework_qty || 0)));
    setInlineCompletedNow(maxAvail > 0 ? 1 : 0);
    setInlineActualWeight(row.completed_weight ? String(row.completed_weight) : String(row.allotted_weight || ''));
    setInlineConsumedWeight(row.completed_weight ? String(row.completed_weight) : String(row.allotted_weight || ''));
    setInlineStoneWeight('');
    setInlineRecoveredWeight('');
    setInlineProcessLoss('');
    setInlineProdStatus(row.completed_qty >= row.required_qty && !row.rework_qty ? 'ready_for_qc' : 'in_progress');
    setInlineRemarks('');
  };

  const handleSaveInlineProduction = async (e) => {
    if (e) e.preventDefault();
    if (!inlineModalRow) return;

    try {
      setActionLoading(true);
      const payload = {
        work_order_item_id: inlineModalRow.itemId,
        completed_now: Number(inlineCompletedNow),
        actual_weight: parseFloat(inlineActualWeight || 0),
        completed_weight: parseFloat(inlineActualWeight || 0),
        consumed_weight: parseFloat(inlineConsumedWeight || 0),
        stone_weight: parseFloat(inlineStoneWeight || 0),
        recovered_weight: parseFloat(inlineRecoveredWeight || 0),
        process_loss: parseFloat(inlineProcessLoss || 0),
        production_status: inlineProdStatus,
        remarks: inlineRemarks || `Completed ${inlineCompletedNow} pc(s) of ${inlineModalRow.product_name}`,
      };

      await api.post(`/work-orders/${inlineModalRow.orderId}/wip-update`, payload);
      showToast?.(`Production details updated for ${inlineModalRow.product_name}!`, 'success');
      setInlineModalRow(null);
      fetchOrdersList();
    } catch (err) {
      showToast?.(err.response?.data?.message || 'Failed to update production details', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const openOperationModal = async (row) => {
    setOpModalRow(row);
    const defaultOp = operationsMasterList.length > 0 ? operationsMasterList[0].name : 'Casting';
    setOpName(defaultOp);
    setOpStatus('in_progress');
    setOpProcessedQty(row.completed_qty > 0 ? row.completed_qty : 1);
    setOpWeight(row.completed_weight ? String(row.completed_weight) : String(row.allotted_weight || ''));
    setOpStaff(row.artisan_name || '');
    setOpRemarks('');
    try {
      const res = await api.get(`/work-orders/${row.orderId}/operations`, {
        params: { work_order_item_id: row.itemId }
      });
      setOpList(res.data?.data || []);
    } catch {
      setOpList([]);
    }
  };

  const handleSaveOperation = async (e) => {
    if (e) e.preventDefault();
    if (!opModalRow) return;

    try {
      setActionLoading(true);
      const payload = {
        work_order_item_id: opModalRow.itemId,
        operation_name: opName,
        status: opStatus,
        processed_qty: Number(opProcessedQty),
        weight_measurement: parseFloat(opWeight || 0),
        assigned_staff: opStaff,
        remarks: opRemarks,
      };

      const res = await api.post(`/work-orders/${opModalRow.orderId}/operations`, payload);
      showToast?.(res.data?.message || `Operation '${opName}' saved!`, 'success');
      setOpList(res.data?.operations || []);
      fetchOrdersList();
      setOpModalRow(null);
    } catch (err) {
      showToast?.(err.response?.data?.message || 'Failed to record operation', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const openHistoryModal = async (row) => {
    setHistoryModalRow(row);
    try {
      const res = await api.get(`/work-orders/${row.orderId}`);
      setHistoryTimeline(res.data?.data?.timelines || []);
    } catch {
      setHistoryTimeline([]);
    }
  };

  // Initial load
  useEffect(() => {
    let isMounted = true;
    (async () => {
      fetchOperationsMaster();
      const list = await fetchOrdersList();
      if (!isMounted) return;

      if (queryOrderId) {
        setSelectedOrderId(queryOrderId);
        fetchOrderDetails(queryOrderId);
      } else {
        setSelectedOrderId(null);
        setCurrentOrder(null);
        setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [queryOrderId, fetchOrdersList, fetchOrderDetails]);

  // Sync form state when currentOrder changes
  useEffect(() => {
    if (currentOrder) {
      setFormStatus(currentOrder.status === 'delayed' ? 'delayed' : (currentOrder.current_stage || 'in_progress'));
      const pendingProd = Math.max(0, (currentOrder.required_qty || 1) - (currentOrder.completed_qty || 0));
      setFormCompletedNow(pendingProd > 0 ? 1 : 0);
      setFormCompletedWeight(
        currentOrder.completed_weight !== undefined && currentOrder.completed_weight !== null
          ? String(currentOrder.completed_weight)
          : ''
      );
      setFormActualWeight(currentOrder.completed_weight ? String(currentOrder.completed_weight) : '');
      setFormNewGoldWeight(currentOrder.completed_weight ? String(currentOrder.completed_weight) : '');
      setFormPurity(currentOrder.purity || '91.6% (22K)');
      setFormExpectedDate(currentOrder.delivery_date ? String(currentOrder.delivery_date).split('T')[0] : '2024-04-28');
      setFormRemarks(currentOrder.karigar_notes || currentOrder.notes || '');
      setFormIsDelayed(Boolean(currentOrder.is_delayed || currentOrder.status === 'delayed'));
      setFormDelayDays(currentOrder.delay_days || 0);
      setFormDelayReason(currentOrder.delay_reason || '');
      setFormDelayRemarks(currentOrder.delay_remarks || '');
      setShowDelayReasonInput(Boolean(currentOrder.is_delayed || currentOrder.status === 'delayed'));
    }
  }, [currentOrder?.id]);

  // Automatic Real-Time Synchronization: Poll every 4 seconds
  useEffect(() => {
    if (!selectedOrderId) return;
    const interval = setInterval(() => {
      fetchOrderDetails(selectedOrderId, true);
    }, 4000);
    return () => clearInterval(interval);
  }, [selectedOrderId, fetchOrderDetails]);

  // Switch Order from Dropdown
  const handleSwitchOrder = (orderId) => {
    setSelectedOrderId(orderId);
    setTimelinePage(1);
    navigate(`/job-order/in-progress?order_id=${orderId}`, { replace: true });
    fetchOrderDetails(orderId);
  };

  // Save Work Progress Update (Supervisor/Manager updates progress without completing units)
  const handleSaveProgress = async (e) => {
    if (e) e.preventDefault();
    if (!currentOrder) return;

    try {
      setActionLoading(true);
      const activeJob = currentOrder.items?.find((it) => it.id === selectedJobId) || currentOrder.items?.[0] || null;
      const payload = {
        work_order_item_id: activeJob?.id || null,
        completed_now: 0,
        completed_weight: parseFloat(formCompletedWeight || 0),
        actual_weight: parseFloat(formActualWeight || formCompletedWeight || 0),
        old_weight: parseFloat(formOldWeight || 0),
        new_gold_weight: parseFloat(formNewGoldWeight || formCompletedWeight || 0),
        purity: formPurity,
        color_stone_weight: parseFloat(formColorStoneWeight || 0),
        silver_weight: parseFloat(formSilverWeight || 0),
        diamond_weight: parseFloat(formDiamondWeight || 0),
        diamond_count: parseInt(formDiamondCount || 0, 10),
        remarks: formRemarks,
        delivery_date: formExpectedDate || null,
        is_delayed: formIsDelayed || formStatus === 'delayed',
        delay_days: parseInt(formDelayDays || 0, 10),
        delay_reason: formDelayReason || null,
        delay_remarks: formDelayRemarks || null,
      };

      const res = await api.post(`/work-orders/${currentOrder.id}/wip-update`, payload);
      setCurrentOrder(res.data.data || res.data);
      showToast?.('Work progress updated successfully!', 'success');
      fetchOrderDetails(currentOrder.id, true);
    } catch (err) {
      showToast?.(err.response?.data?.message || 'Failed to update work progress', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Mark as Delay / Hold
  const handleToggleDelay = () => {
    setFormIsDelayed(true);
    setFormStatus('delayed');
    setShowDelayReasonInput(true);
    showToast?.('Status updated to Delayed / On Hold. Please enter delay details and save.', 'info');
  };

  // Dedicated Action: Partial Work Completed (Send for QC)
  const handleWorkCompletedQC = async () => {
    if (!currentOrder) return;
    
    // Resolve active targeted job item if available
    const activeJob = currentOrder.items?.find((it) => it.id === selectedJobId) || currentOrder.items?.[0] || null;
    const workOrderItemId = activeJob?.id || null;

    const reqQty = activeJob ? (activeJob.required_qty || 1) : (currentOrder.required_qty || 1);
    const compQty = activeJob ? (activeJob.completed_qty || 0) : (currentOrder.completed_qty || 0);
    const pendingProduction = Math.max(0, reqQty - compQty);
    const jobLabel = activeJob ? `${activeJob.design_no || 'Job'} (${activeJob.product_name})` : 'Work Order';

    const completedNow = parseInt(formCompletedNow || 1, 10);

    if (completedNow <= 0) {
      showToast?.('Please enter completed quantity greater than 0', 'warning');
      return;
    }
    if (completedNow > pendingProduction) {
      showToast?.(`Completed quantity (${completedNow}) cannot exceed remaining production (${pendingProduction} pcs) for ${jobLabel}`, 'warning');
      return;
    }

    const confirmed = await showConfirm({
      title: `Submit Completed Pieces for QC — ${jobLabel}`,
      message: `Submit ${completedNow} finished piece(s) for ${jobLabel} to Quality Check? The remaining ${pendingProduction - completedNow} piece(s) will stay active in Work In Process for the artisan.`,
      icon: 'fa-solid fa-circle-check',
      confirmText: 'Submit to QC'
    });
    if (!confirmed) return;

    try {
      setActionLoading(true);
      const payload = {
        work_order_item_id: workOrderItemId,
        completed_now: completedNow,
        completed_weight: parseFloat(formCompletedWeight || 0),
        actual_weight: parseFloat(formActualWeight || formCompletedWeight || 0),
        old_weight: parseFloat(formOldWeight || 0),
        new_gold_weight: parseFloat(formNewGoldWeight || formCompletedWeight || 0),
        purity: formPurity,
        color_stone_weight: parseFloat(formColorStoneWeight || 0),
        silver_weight: parseFloat(formSilverWeight || 0),
        diamond_weight: parseFloat(formDiamondWeight || 0),
        diamond_count: parseInt(formDiamondCount || 0, 10),
        remarks: formRemarks || `Completed ${completedNow} piece(s) of ${jobLabel} submitted for Quality Check`,
        delivery_date: formExpectedDate || null,
        is_delayed: formIsDelayed || formStatus === 'delayed',
        delay_days: parseInt(formDelayDays || 0, 10),
        delay_reason: formDelayReason || null,
        delay_remarks: formDelayRemarks || null,
      };

      const res = await api.post(`/work-orders/${currentOrder.id}/wip-update`, payload);
      setCurrentOrder(res.data.data || res.data);
      showToast?.(`${completedNow} piece(s) of ${jobLabel} successfully moved to Quality Check!`, 'success');
      fetchOrderDetails(currentOrder.id, true);
    } catch (err) {
      showToast?.(err.response?.data?.message || 'Failed to submit completed pieces for QC', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Helper for update badge styling matching screenshot
  const renderUpdateBadge = (label) => {
    const s = String(label || '').toLowerCase();
    if (s.includes('started') || s.includes('created')) {
      return (
        <span className="px-3 py-1 rounded-md text-[11px] font-semibold bg-[#e7e5e4] text-[#44403c] border border-stone-300/40 inline-block">
          Work Started
        </span>
      );
    }
    if (s.includes('delay') || s.includes('hold')) {
      return (
        <span className="px-3 py-1 rounded-md text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-200 inline-block">
          Delay / Hold
        </span>
      );
    }
    if (s.includes('qc') || s.includes('quality') || s.includes('completed') || s.includes('sent for qc')) {
      return (
        <span className="px-3 py-1 rounded-md text-[11px] font-semibold bg-emerald-100 text-emerald-900 border border-emerald-200 inline-block">
          Sent for QC
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-md text-[11px] font-semibold bg-[#ffe4e6] text-[#9f1239] border border-rose-200 inline-block">
        Progress Update
      </span>
    );
  };

  // Computed weights and status directly from form input & database
  const allocatedWeight = currentOrder ? parseFloat(currentOrder.allotted_weight || 0) : 0;
  const completedWeight = formCompletedWeight !== '' ? (parseFloat(formCompletedWeight) || 0) : (currentOrder ? parseFloat(currentOrder.completed_weight || 0) : 0);
  const pendingWeight = currentOrder ? (currentOrder.pending_weight !== undefined ? parseFloat(currentOrder.pending_weight) : Math.max(0, allocatedWeight - completedWeight)) : Math.max(0, allocatedWeight - completedWeight);
  const progressPercent = allocatedWeight > 0 ? Math.min(100, Math.max(0, (completedWeight / allocatedWeight) * 100)) : 0;

  // Real Database Details
  const jobId = currentOrder?.design_code || currentOrder?.work_order_number || (currentOrder?.id ? `RJ-3836-${String(currentOrder.id).padStart(6, '0')}` : 'RJ-3836-000125');
  const clientId = currentOrder?.client?.client_code || (currentOrder?.client_id ? `CL-2024-${String(currentOrder.client_id).padStart(5, '0')}` : 'CL-2024-00458');
  const clientName = currentOrder?.customer_name || currentOrder?.client?.full_name || currentOrder?.client?.name || currentOrder?.client_name || 'Rajesh Vishwakarma';
  const karigarName = currentOrder?.karigar?.name || currentOrder?.karigar_name || 'Manikandan';
  const workStartedDate = formatDateDisplay(currentOrder?.allotted_date || currentOrder?.created_at || '2024-04-24');

  const jobType = currentOrder?.product_name || 'Gold Necklace';
  const categoryName = currentOrder?.category?.name || 'Necklace';
  const materialType = currentOrder?.material_type || '22K Gold';
  const purityLabel = currentOrder?.purity || '22 Karat';

  // Real Timelines from Database
  const rawTimelines = currentOrder?.timelines || [];
  const timelines = rawTimelines.length > 0 ? rawTimelines : [
    {
      id: 'step-1',
      created_at: '2024-04-24T10:00:00',
      action_by_name: karigarName,
      stage_label: 'Work Started',
      notes: 'Work started at workshop',
      completed_weight_at_step: 0.000,
    },
    {
      id: 'step-2',
      created_at: '2024-04-25T16:30:00',
      action_by_name: karigarName,
      stage_label: 'Progress Update',
      notes: 'Designing completed',
      completed_weight_at_step: 5.250,
    },
    {
      id: 'step-3',
      created_at: '2024-04-26T14:15:00',
      action_by_name: karigarName,
      stage_label: 'Progress Update',
      notes: 'Stone setting completed',
      completed_weight_at_step: 12.250,
    }
  ];

  // Real Pagination Calculation
  const totalTimelines = timelines.length;
  const totalTimelinePages = Math.max(1, Math.ceil(totalTimelines / timelinesPerPage));
  const safeTimelinePage = Math.min(timelinePage, totalTimelinePages);
  const startTimelineIndex = (safeTimelinePage - 1) * timelinesPerPage;
  const paginatedTimelines = timelines.slice(startTimelineIndex, startTimelineIndex + timelinesPerPage);

  if (loading && !currentOrder) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] text-stone-400 gap-3 font-['Inter',sans-serif]">
        <div className="w-10 h-10 border-4 border-[#b01622] border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm font-semibold text-stone-600">Loading Work in Progress details...</span>
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
            <span className="text-stone-800 font-semibold">Work In Progress</span>
          </div>

          {/* Main Title & Search Bar replacing dropdown */}
          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-[#1c1917] tracking-tight">
              Work In Progress {currentOrder ? `- ${jobId}` : ''}
            </h1>

            {/* Search Bar Input (Only shown on Work Orders List View) */}
            {!currentOrder && (
              <div className="relative w-full sm:w-80">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs"></i>
                <input
                  type="text"
                  placeholder="Search Work Order No, Product, Artisan..."
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

        {/* Back Buttons */}
        <div className="flex items-center gap-2">
          {currentOrder && (
            <button
              type="button"
              onClick={() => {
                setSelectedOrderId(null);
                setCurrentOrder(null);
                navigate('/job-order/in-progress', { replace: true });
              }}
              className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-md shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <i className="fa-solid fa-list text-[11px] text-stone-600"></i>
              <span>All Work Orders List</span>
            </button>
          )}

        </div>
      </div>

      {/* 2. SUB NAVIGATION TABS */}
      <div className="border-b border-[#ebd0cb]">
        <div className="flex items-center gap-10 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => {
              setSelectedOrderId(null);
              setCurrentOrder(null);
              navigate('/job-order/in-progress', { replace: true });
            }}
            className="pb-3 text-[14px] font-bold text-[#5c2725] border-b-2 border-[#b01622] whitespace-nowrap cursor-pointer"
          >
            Work In Progress
          </button>

          <Link
            to="/job-order/delay"
            className="pb-3 text-[14px] font-bold text-[#6e2d27] hover:text-[#b01622] border-b-2 border-transparent transition-colors cursor-pointer whitespace-nowrap"
          >
            Delay / Job Details
          </Link>

          {!isKarigar && (
            <>
              <Link
                to="/job-order/quality-check"
                className="pb-3 text-[14px] font-bold text-[#6e2d27] hover:text-[#b01622] border-b-2 border-transparent transition-colors cursor-pointer whitespace-nowrap"
              >
                Quality Check
              </Link>
              <Link
                to="/job-order/ready"
                className="pb-3 text-[14px] font-bold text-[#6e2d27] hover:text-[#b01622] border-b-2 border-transparent transition-colors cursor-pointer whitespace-nowrap"
              >
                Ready
              </Link>
              <Link
                to="/job-order/certification"
                className="pb-3 text-[14px] font-bold text-[#6e2d27] hover:text-[#b01622] border-b-2 border-transparent transition-colors cursor-pointer whitespace-nowrap"
              >
                Certification
              </Link>
              <Link
                to="/job-order/hallmarking"
                className="pb-3 text-[14px] font-bold text-[#6e2d27] hover:text-[#b01622] border-b-2 border-transparent transition-colors cursor-pointer whitespace-nowrap"
              >
                Hallmarking
              </Link>
            </>
          )}

          <Link
            to="/job-order/history"
            className="pb-3 text-[14px] font-bold text-[#6e2d27] hover:text-[#b01622] border-b-2 border-transparent transition-colors cursor-pointer whitespace-nowrap"
          >
            History
          </Link>
        </div>
      </div>

      {/* 3. CONDITIONAL RENDER: WORK ORDERS ROWS LIST OR SINGLE ORDER DETAIL WORKBENCH */}
      {!currentOrder ? (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3 border-b border-stone-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-[#111827] tracking-tight flex items-center gap-2">
                <span>Work In Progress Products ({allWipItems.length})</span>
                {selectedRowKeys.length > 0 && (
                  <span className="text-xs font-bold text-[#b01622] bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                    {selectedRowKeys.length} Selected
                  </span>
                )}
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Select completed products and click "Send Selected Products to QC" to submit them to inspection.
              </p>
            </div>
            {selectedRowKeys.length > 0 && (
              <button
                type="button"
                onClick={handleBatchSubmitQc}
                disabled={actionLoading}
                className="px-4 py-2 bg-[#b01622] hover:bg-[#8e111a] text-white text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                <i className="fa-solid fa-paper-plane text-xs"></i>
                <span>Send Selected Products to QC ({selectedRowKeys.length})</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[1050px]">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/60 text-stone-600 font-semibold text-[11px]">
                  <th className="py-3 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={paginatedWipItems.length > 0 && paginatedWipItems.every((r) => selectedRowKeys.includes(r.rowKey))}
                      onChange={toggleSelectAll}
                      className="rounded border-stone-300 text-[#b01622] focus:ring-[#b01622] cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-3 whitespace-nowrap">WORK ORDER NO</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap">PRODUCT NO.</th>
                  <th className="py-3 px-3 whitespace-nowrap">PRODUCT &amp; DESIGN</th>
                  <th className="py-3 px-3 whitespace-nowrap">KARIGAR</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap">ALLOTTED WT</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap">COMPLETED WT</th>
                  <th className="py-3 px-2 text-center whitespace-nowrap">REQ</th>
                  <th className="py-3 px-2 text-center whitespace-nowrap">DONE</th>
                  <th className="py-3 px-2 text-center whitespace-nowrap">PENDING</th>
                  <th className="py-3 px-2 text-center whitespace-nowrap">QC PENDING</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap">STATUS</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {loading ? (
                  <tr>
                    <td colSpan="13" className="py-12 text-center text-stone-400 text-xs">
                      <i className="fa-solid fa-spinner fa-spin text-[#b01622] mr-2"></i>
                      Loading Work In Progress jobs...
                    </td>
                  </tr>
                ) : allWipItems.length === 0 ? (
                  <tr>
                    <td colSpan="13" className="py-12 text-center text-stone-400 text-xs">
                      No Work In Progress product items found matching your search.
                    </td>
                  </tr>
                ) : (
                  paginatedWipItems.map((row) => {
                    const isSelected = selectedRowKeys.includes(row.rowKey);
                    return (
                      <tr
                        key={row.rowKey}
                        className={`transition-colors border-b border-stone-50 ${
                          isSelected ? 'bg-rose-50/40' : 'hover:bg-stone-50/70'
                        }`}
                      >
                        <td className="py-3.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(row.rowKey)}
                            className="rounded border-stone-300 text-[#b01622] focus:ring-[#b01622] cursor-pointer"
                          />
                        </td>
                        <td className="py-3.5 px-3 font-mono font-bold text-[#b01622] whitespace-nowrap">
                          {row.work_order_number}
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono font-bold text-stone-700">
                          {row.productNo}
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2">
                            {row.thumbnail ? (
                              <img
                                src={row.thumbnail}
                                alt={row.product_name}
                                className="w-7 h-7 rounded object-cover border border-stone-200 shrink-0"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded bg-amber-50 border border-amber-200/60 flex items-center justify-center shrink-0 text-amber-700">
                                <i className="fa-solid fa-gem text-[10px]"></i>
                              </div>
                            )}
                            <div>
                              <span className="font-bold text-gray-900 text-xs block leading-tight">
                                {cleanProductName(row.product_name, row.design_no)}
                              </span>
                              <span className="font-mono text-[10px] text-stone-500 block">
                                {row.design_no} ({row.karat})
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 font-medium text-stone-700 text-xs whitespace-nowrap truncate max-w-[120px]" title={row.artisan_name}>
                          {row.artisan_name}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-stone-900">
                          {row.allotted_weight.toFixed(3)}g
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-700">
                          {row.completed_weight.toFixed(3)}g
                        </td>
                        <td className="py-3.5 px-2 text-center font-bold text-stone-800 text-xs">
                          {row.required_qty}
                        </td>
                        <td className="py-3.5 px-2 text-center font-bold text-emerald-600 text-xs">
                          {row.completed_qty}
                        </td>
                        <td className="py-3.5 px-2 text-center font-bold text-amber-700 text-xs">
                          {row.rework_qty > 0 ? (
                            <div>
                              <span className="text-amber-900 font-extrabold text-xs">{row.total_in_process}</span>
                              <span className="text-[10px] text-amber-700 font-medium block leading-tight">
                                ({row.pending_qty}+{row.rework_qty} returned)
                              </span>
                            </div>
                          ) : (
                            row.pending_qty
                          )}
                        </td>
                        <td className="py-3.5 px-2 text-center font-mono">
                          {row.qc_pending_qty > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                              {row.qc_pending_qty}
                            </span>
                          ) : (
                            <span className="text-xs text-stone-400 font-bold">0</span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          {row.rework_qty > 0 ? (
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1"
                              title={row.return_reason ? `Rework: ${row.return_reason}` : 'Returned from QC for rework'}
                            >
                              <i className="fa-solid fa-rotate-left text-[9px] text-amber-700"></i>
                              <span>Rework ({row.rework_qty})</span>
                            </span>
                          ) : row.is_delayed ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                              Delayed
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-700 capitalize">
                              {row.current_stage.replace('_', ' ')}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          <div className="inline-flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => openInlineProductionModal(row)}
                              className="px-2 py-1 bg-stone-800 hover:bg-stone-900 text-white text-[11px] font-bold rounded-md transition-colors cursor-pointer shadow-2xs"
                              title="Update Production details"
                            >
                              <i className="fa-solid fa-[#b01622] fa-pen-to-square mr-1"></i> Production
                            </button>
                            <button
                              type="button"
                              onClick={() => openOperationModal(row)}
                              className="px-2 py-1 bg-indigo-700 hover:bg-indigo-800 text-white text-[11px] font-bold rounded-md transition-colors cursor-pointer shadow-2xs"
                              title="Record Manufacturing Operation"
                            >
                              <i className="fa-solid fa-gears mr-1"></i> Operation
                            </button>
                            <button
                              type="button"
                              onClick={() => openHistoryModal(row)}
                              className="px-2 py-1 bg-slate-600 hover:bg-slate-700 text-white text-[11px] font-bold rounded-md transition-colors cursor-pointer shadow-2xs"
                              title="View Production History"
                            >
                              <i className="fa-solid fa-clock-rotate-left mr-1"></i> History
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedOrderId(row.orderId);
                                navigate(`/job-order/in-progress?order_id=${row.orderId}`);
                                fetchOrderDetails(row.orderId);
                              }}
                              className="px-2 py-1 bg-[#b01622] hover:bg-[#8e111a] text-white text-[11px] font-bold rounded-md transition-colors cursor-pointer shadow-2xs"
                            >
                              Workbench →
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

          {/* Pagination Controls */}
          {allWipItems.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-stone-100 mt-4">
              <div className="text-xs text-stone-500 font-medium">
                Showing <span className="font-bold text-stone-800">{startIndex + 1}</span> to{' '}
                <span className="font-bold text-stone-800">{Math.min(startIndex + itemsPerPage, totalWipItems)}</span> of{' '}
                <span className="font-bold text-stone-800">{totalWipItems}</span> entries
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
                        acc.push(<span key={`dots-${p}`} className="px-1 text-stone-400 text-xs font-bold">...</span>);
                      }
                      acc.push(
                        <button
                          key={p}
                          type="button"
                          onClick={() => setCurrentPage(p)}
                          className={`w-7 h-7 rounded-md text-xs font-bold transition-all cursor-pointer ${p === safePage
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
        <>
          {/* TOP INFO CARD (5 Columns) */}
          <div className="bg-[#F4F6F7] rounded-xl border border-[#eed5d1] p-4 sm:p-5 shadow-2xs grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
            <div>
              <span className="text-[11px] font-semibold text-stone-500 block mb-1">
                Job ID
              </span>
              <span className="text-sm font-bold text-[#1c1917] block">
                {jobId}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-stone-500 block mb-1">
                Client ID
              </span>
              <span className="text-sm font-bold text-[#1c1917] block">
                {clientId}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-stone-500 block mb-1">
                Client Name
              </span>
              <span className="text-sm font-bold text-[#1c1917] block truncate">
                {clientName}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-stone-500 block mb-1">
                Assigned Karigar
              </span>
              <span className="text-sm font-bold text-[#1c1917] block truncate">
                {karigarName}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-stone-500 block mb-1">
                Work Started
              </span>
              <span className="text-sm font-bold text-[#1c1917] block">
                {workStartedDate}
              </span>
            </div>
          </div>

          {/* 6-METRIC QUANTITY LIFECYCLE STRIP */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-stone-500 block">Required Qty</span>
              <span className="text-lg font-black text-stone-900 block mt-0.5">{currentOrder.required_qty || 1}</span>
              <span className="text-[10px] text-stone-400">Total ordered</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">Total Produced</span>
              <span className="text-lg font-black text-emerald-800 block mt-0.5">{currentOrder.completed_qty || 0}</span>
              <span className="text-[10px] text-emerald-600">Finished by Karigar</span>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-blue-700 block">Awaiting QC</span>
              <span className="text-lg font-black text-blue-800 block mt-0.5">{currentOrder.qc_pending_qty || 0}</span>
              <span className="text-[10px] text-blue-600">In inspection queue</span>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-indigo-700 block">QC Approved / Ready</span>
              <span className="text-lg font-black text-indigo-800 block mt-0.5">{currentOrder.ready_qty || 0}</span>
              <span className="text-[10px] text-indigo-600">Passed QC / Pipeline</span>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-purple-700 block">Received in Store</span>
              <span className="text-lg font-black text-purple-800 block mt-0.5">{currentOrder.received_qty || 0}</span>
              <span className="text-[10px] text-purple-600">Tagged & In Stock</span>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-amber-800 block">Pending Production</span>
              <span className="text-lg font-black text-amber-900 block mt-0.5">
                {Math.max(0, (currentOrder.required_qty || 1) - (currentOrder.completed_qty || 0))}
              </span>
              <span className="text-[10px] text-amber-700">Artisan to finish</span>
            </div>
          </div>

          {/* MULTI-JOB BREAKDOWN (If Work Order has multiple jobs) */}
          {currentOrder.items && currentOrder.items.length > 0 && (
            <div className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
                  <i className="fa-solid fa-list-check text-[#b01622]"></i>
                  <span>Jobs in this Work Order ({currentOrder.items.length})</span>
                </h4>
                <span className="text-[11px] text-stone-500 font-medium">Click any job row to select & update its progress independently</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50/60 text-stone-600 text-[10px] font-bold uppercase">
                      <th className="py-2 px-3">Job / Design</th>
                      <th className="py-2 px-3">Product Name</th>
                      <th className="py-2 px-2 text-center">Req Qty</th>
                      <th className="py-2 px-2 text-center">Done</th>
                      <th className="py-2 px-2 text-center">Awaiting QC</th>
                      <th className="py-2 px-2 text-center">Ready</th>
                      <th className="py-2 px-2 text-center">Received</th>
                      <th className="py-2 px-2 text-center">Pending</th>
                      <th className="py-2 px-3 text-right">Allotted Wt</th>
                      <th className="py-2 px-3 text-right">Done Wt</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-mono text-[11px]">
                    {currentOrder.items.map((it) => {
                      const isSelected = selectedJobId === it.id;
                      const pend = Math.max(0, (it.required_qty || 1) - (it.completed_qty || 0));
                      return (
                        <tr
                          key={it.id}
                          onClick={() => {
                            setSelectedJobId(it.id);
                            setFormCompletedNow(1);
                          }}
                          className={`cursor-pointer transition-colors ${isSelected ? 'bg-red-50/70 border-l-4 border-l-[#b01622]' : 'hover:bg-stone-50/60'}`}
                        >
                          <td className="py-2.5 px-3 font-bold text-[#b01622]">
                            {it.design_no || it.item_code || `JOB-${it.id}`}
                          </td>
                          <td className="py-2.5 px-3 font-sans font-semibold text-stone-800">{it.product_name}</td>
                          <td className="py-2.5 px-2 text-center font-bold text-stone-900">{it.required_qty}</td>
                          <td className="py-2.5 px-2 text-center font-bold text-emerald-600">{it.completed_qty}</td>
                          <td className="py-2.5 px-2 text-center font-bold text-blue-600">{it.qc_pending_qty || 0}</td>
                          <td className="py-2.5 px-2 text-center font-bold text-indigo-600">{it.ready_qty || 0}</td>
                          <td className="py-2.5 px-2 text-center font-bold text-purple-600">{it.received_qty || 0}</td>
                          <td className="py-2.5 px-2 text-center font-bold text-amber-700">{pend}</td>
                          <td className="py-2.5 px-3 text-right">{Number(it.allotted_weight ?? it.allocated_weight ?? it.gold_weight ?? it.total_weight ?? 0).toFixed(3)}g</td>
                          <td className="py-2.5 px-3 text-right text-emerald-700">{Number(it.completed_weight ?? it.done_weight ?? it.actual_weight ?? 0).toFixed(3)}g</td>
                          <td className="py-2.5 px-3 font-sans">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${it.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>
                              {it.status || 'in_progress'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. MAIN GRID SECTION (7 Cols / 5 Cols Layout) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

            {/* LEFT COLUMN: Progress Overview & Actions (7 Cols) */}
            <div className="lg:col-span-7 space-y-5">

              {/* Card: Progress Overview */}
              <div className="bg-[#F4F6F7] rounded-xl border border-[#eed5d1] p-5 shadow-2xs space-y-4">
                {(() => {
                  const activeJob = currentOrder.items?.find((it) => it.id === selectedJobId) || currentOrder.items?.[0] || null;
                  const activeReq = activeJob ? (activeJob.required_qty || 1) : (currentOrder.required_qty || 1);
                  const activeComp = activeJob ? (activeJob.completed_qty || 0) : (currentOrder.completed_qty || 0);
                  const activePending = Math.max(0, activeReq - activeComp);
                  const activeJobLabel = activeJob ? `${activeJob.design_no || 'Job'} — ${activeJob.product_name}` : currentOrder.product_name;

                  return (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200/60 pb-3">
                        <div>
                          <h3 className="text-base font-bold text-[#1c1917] flex items-center gap-2">
                            <i className="fa-solid fa-pen-nib text-[#b01622]"></i>
                            <span>Manager / Supervisor Work Update</span>
                          </h3>
                          {activeJob && (
                            <p className="text-xs font-bold text-[#b01622] mt-0.5">
                              Updating Job: <span className="underline">{activeJobLabel}</span>
                            </p>
                          )}
                        </div>

                        {currentOrder.items && currentOrder.items.length > 1 && (
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-stone-700">Target Job:</label>
                            <select
                              value={selectedJobId || ''}
                              onChange={(e) => {
                                const id = parseInt(e.target.value, 10);
                                setSelectedJobId(id);
                                setFormCompletedNow(1);
                              }}
                              className="px-2.5 py-1 bg-white border border-stone-300 rounded-lg text-xs font-bold text-[#b01622] focus:outline-none shadow-2xs"
                            >
                              {currentOrder.items.map((it) => (
                                <option key={it.id} value={it.id}>
                                  {it.design_no || `JOB-${it.id}`} — {it.product_name} (Req: {it.required_qty}, Done: {it.completed_qty})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <span className="text-[11px] font-bold text-stone-500">
                          Remaining to Produce: <span className="text-[#b01622] font-black">{activePending} pcs</span>
                        </span>
                      </div>

                      {/* Partial Completion Quantity Selector */}
                      <div className="bg-white p-3.5 rounded-lg border border-red-100 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <label className="block text-xs font-bold text-stone-900">
                            Completed Now (Quantity to move to QC) <span className="text-[#b01622]">*</span>
                          </label>
                          <p className="text-[11px] text-stone-500">
                            Enter number of physical pieces finished now for {activeJob ? activeJob.design_no : 'this job'}. Remaining pieces stay in WIP.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max={activePending}
                            value={formCompletedNow}
                            onChange={(e) => setFormCompletedNow(Math.max(0, parseInt(e.target.value || 0, 10)))}
                            className="w-24 px-3 py-1.5 text-center font-bold font-mono text-base border-2 border-[#b01622] rounded-lg focus:outline-hidden bg-red-50 text-[#b01622]"
                          />
                          <span className="text-xs font-bold text-stone-600">pcs</span>
                        </div>
                      </div>
                    </>
                  );
                })()}

                {/* Weights and Metal Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Actual Finished Wt (gm)
                    </label>
                    <input
                      type="text"
                      value={formActualWeight}
                      onChange={(e) => {
                        const val = sanitizeDecimal(e.target.value);
                        setFormActualWeight(val);
                        setFormCompletedWeight(val);
                      }}
                      onKeyDown={handleDecimalKeyDown}
                      placeholder="e.g. 8.250"
                      className="w-full bg-white border border-[#eed5d1] rounded-md px-3 py-2 text-xs font-mono font-semibold text-stone-900 focus:outline-hidden focus:border-[#b01622]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      New Gold Wt (gm)
                    </label>
                    <input
                      type="text"
                      value={formNewGoldWeight}
                      onChange={(e) => setFormNewGoldWeight(sanitizeDecimal(e.target.value))}
                      onKeyDown={handleDecimalKeyDown}
                      placeholder="e.g. 7.900"
                      className="w-full bg-white border border-[#eed5d1] rounded-md px-3 py-2 text-xs font-mono font-semibold text-stone-900 focus:outline-hidden focus:border-[#b01622]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Purity / Touch
                    </label>
                    <input
                      type="text"
                      value={formPurity}
                      onChange={(e) => setFormPurity(e.target.value)}
                      placeholder="91.6% (22K)"
                      className="w-full bg-white border border-[#eed5d1] rounded-md px-3 py-2 text-xs font-semibold text-stone-900 focus:outline-hidden focus:border-[#b01622]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Colour Stone (gm)
                    </label>
                    <input
                      type="text"
                      value={formColorStoneWeight}
                      onChange={(e) => setFormColorStoneWeight(sanitizeDecimal(e.target.value))}
                      onKeyDown={handleDecimalKeyDown}
                      placeholder="0.000"
                      className="w-full bg-white border border-[#eed5d1] rounded-md px-3 py-2 text-xs font-mono text-stone-900 focus:outline-hidden focus:border-[#b01622]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Silver (gm)
                    </label>
                    <input
                      type="text"
                      value={formSilverWeight}
                      onChange={(e) => setFormSilverWeight(sanitizeDecimal(e.target.value))}
                      onKeyDown={handleDecimalKeyDown}
                      placeholder="0.000"
                      className="w-full bg-white border border-[#eed5d1] rounded-md px-3 py-2 text-xs font-mono text-stone-900 focus:outline-hidden focus:border-[#b01622]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Diamond (cts / pcs)
                    </label>
                    <div className="grid grid-cols-2 gap-1">
                      <input
                        type="text"
                        value={formDiamondWeight}
                        onChange={(e) => setFormDiamondWeight(sanitizeDecimal(e.target.value))}
                        onKeyDown={handleDecimalKeyDown}
                        placeholder="Cts"
                        className="w-full bg-white border border-[#eed5d1] rounded-md px-2 py-2 text-xs font-mono text-stone-900 focus:outline-hidden focus:border-[#b01622]"
                      />
                      <input
                        type="number"
                        value={formDiamondCount}
                        onChange={(e) => setFormDiamondCount(e.target.value)}
                        placeholder="Pcs"
                        className="w-full bg-white border border-[#eed5d1] rounded-md px-2 py-2 text-xs font-mono text-stone-900 focus:outline-hidden focus:border-[#b01622]"
                      />
                    </div>
                  </div>
                </div>

                {/* Delay Section Toggle & Inputs */}
                <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-lg space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formIsDelayed}
                        onChange={(e) => {
                          setFormIsDelayed(e.target.checked);
                          setShowDelayReasonInput(e.target.checked);
                        }}
                        className="w-4 h-4 text-[#b01622] rounded cursor-pointer"
                      />
                      <span>Record Delay / Production Hold for this Work Order</span>
                    </label>
                    {formIsDelayed && (
                      <span className="text-[10px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded">
                        Will appear on Delay Page
                      </span>
                    )}
                  </div>

                  {formIsDelayed && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                      <div>
                        <label className="block text-[10px] font-bold text-amber-900 mb-0.5">Delay (Days)</label>
                        <input
                          type="number"
                          min="1"
                          value={formDelayDays}
                          onChange={(e) => setFormDelayDays(parseInt(e.target.value || 0, 10))}
                          className="w-full bg-white border border-amber-300 rounded px-2.5 py-1.5 text-xs font-mono text-stone-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-amber-900 mb-0.5">Delay Reason</label>
                        <input
                          type="text"
                          value={formDelayReason}
                          onChange={(e) => setFormDelayReason(e.target.value)}
                          placeholder="e.g. Stone not available / Karigar ill"
                          className="w-full bg-white border border-amber-300 rounded px-2.5 py-1.5 text-xs text-stone-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-amber-900 mb-0.5">Delay Remarks</label>
                        <input
                          type="text"
                          value={formDelayRemarks}
                          onChange={(e) => setFormDelayRemarks(e.target.value)}
                          placeholder="Expected resolution..."
                          className="w-full bg-white border border-amber-300 rounded px-2.5 py-1.5 text-xs text-stone-900"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Remarks */}
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                    Supervisor / Work Progress Remarks
                  </label>
                  <textarea
                    rows={2}
                    value={formRemarks}
                    onChange={(e) => setFormRemarks(e.target.value)}
                    placeholder="Work progress notes, polishing stage, setting details..."
                    className="w-full bg-white border border-[#eed5d1] rounded-md p-2.5 text-xs text-stone-800 focus:outline-hidden focus:border-[#b01622] resize-none"
                  ></textarea>
                </div>
              </div>

              {/* Card: NEXT ACTION */}
              <div className="bg-[#F4F6F7] rounded-xl border border-[#eed5d1] p-5 shadow-2xs space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block">
                  ACTION DISPATCH
                </span>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleToggleDelay}
                      disabled={actionLoading}
                      className="px-3.5 py-2 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <i className="fa-regular fa-circle-pause text-stone-500"></i>
                      <span>Mark as Delay</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveProgress}
                      disabled={actionLoading}
                      className="px-3.5 py-2 bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 text-xs font-bold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      {actionLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-floppy-disk text-[#b01622]"></i>}
                      <span>Save Progress Update</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById('timeline-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="px-3.5 py-2 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <i className="fa-solid fa-chart-line text-stone-500"></i>
                      <span>Timeline</span>
                    </button>
                  </div>

                  {/* Right primary action button: Submit Completed Quantity to QC */}
                  <button
                    type="button"
                    onClick={handleWorkCompletedQC}
                    disabled={actionLoading || formCompletedNow <= 0}
                    className="px-5 py-2.5 bg-[#b01622] hover:bg-[#8f1019] text-white text-xs font-black rounded-lg shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading && <i className="fa-solid fa-circle-notch fa-spin"></i>}
                    <i className="fa-solid fa-clipboard-check"></i>
                    <span>Submit {formCompletedNow} pc(s) for QC</span>
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Item Details (5 Cols) */}
            <div className="lg:col-span-5">
              <div className="bg-[#F4F6F7] rounded-xl border border-[#eed5d1] p-5 shadow-2xs space-y-3.5">
                <h3 className="text-lg font-bold text-[#1c1917] pb-2 border-b border-[#f5f5f4]">
                  Item Details
                </h3>

                <div className="space-y-3.5 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-stone-100/60">
                    <span className="text-stone-600 font-medium">Job Type</span>
                    <span className="font-bold text-[#1c1917]">{jobType}</span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-stone-100/60">
                    <span className="text-stone-600 font-medium">Category</span>
                    <span className="font-bold text-[#1c1917]">{categoryName}</span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-stone-100/60">
                    <span className="text-stone-600 font-medium">Material</span>
                    <span className="font-bold text-[#1c1917]">{materialType}</span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-stone-100/60">
                    <span className="text-stone-600 font-medium">Purity</span>
                    <span className="font-bold text-[#1c1917]">{purityLabel}</span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-stone-100/60">
                    <span className="text-stone-600 font-medium">Weight (Alloc.)</span>
                    <span className="font-bold text-[#1c1917]">{allocatedWeight.toFixed(3)} gm</span>
                  </div>

                  {/* Completed (gm) highlighted in crimson bold font */}
                  <div className="flex items-center justify-between py-2 px-3 bg-[#fef2f2] rounded-md border border-rose-100">
                    <span className="text-stone-800 font-semibold">Completed (gm)</span>
                    <span className="font-black text-sm text-[#991b1b] font-serif">
                      {completedWeight.toFixed(3)} gm
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-stone-600 font-medium">Pending (gm)</span>
                    <span className="font-bold text-[#1c1917]">{pendingWeight.toFixed(3)} gm</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 5. BOTTOM SECTION: Work Progress Timeline Table */}
          <div id="timeline-section" className="bg-[#F4F6F7] rounded-xl border border-[#eed5d1] shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-[#f5f5f4]">
              <h3 className="text-lg font-bold text-[#1c1917]">
                Work Progress Timeline
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#eed5d1] bg-[#fafaf9] text-[#78716c] font-bold uppercase text-[11px] tracking-wider">
                    <th className="py-3 px-4">UPDATE DATE</th>
                    <th className="py-3 px-4">UPDATED BY</th>
                    <th className="py-3 px-4">UPDATE TYPE</th>
                    <th className="py-3 px-4">DETAILS</th>
                    <th className="py-3 px-4 text-right">UPDATED WEIGHT (GM)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {paginatedTimelines.map((step, idx) => (
                    <tr key={step.id || idx} className="hover:bg-stone-50/70 transition-colors">
                      <td className="py-3.5 px-4 text-stone-700 font-medium whitespace-nowrap">
                        {formatTimelineDate(step.created_at)}
                      </td>
                      <td className="py-3.5 px-4 text-stone-900 font-semibold whitespace-nowrap">
                        {step.action_by_name || karigarName}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderUpdateBadge(step.stage_label || step.stage)}
                      </td>
                      <td className="py-3.5 px-4 text-stone-700">
                        {step.notes || step.stage_label || 'Work progress update'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-stone-900 whitespace-nowrap">
                        {formatWeight(step.completed_weight_at_step !== undefined ? step.completed_weight_at_step : completedWeight)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="p-3.5 border-t border-[#eed5d1] bg-white flex items-center justify-between text-xs">
              <span className="text-stone-500">
                Showing {totalTimelines === 0 ? 0 : startTimelineIndex + 1} to {Math.min(startTimelineIndex + timelinesPerPage, totalTimelines)} of {totalTimelines} updates
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={safeTimelinePage <= 1}
                  onClick={() => setTimelinePage((prev) => Math.max(1, prev - 1))}
                  className="px-3 py-1 rounded-md border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-40 cursor-pointer"
                >
                  Previous
                </button>
                <span className="px-2 font-semibold text-stone-800">
                  Page {safeTimelinePage} of {totalTimelinePages}
                </span>
                <button
                  type="button"
                  disabled={safeTimelinePage >= totalTimelinePages}
                  onClick={() => setTimelinePage((prev) => Math.min(totalTimelinePages, prev + 1))}
                  className="px-3 py-1 rounded-md border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 4. MODAL OVERLAY: UPDATE PRODUCTION DETAILS */}
      {inlineModalRow && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-stone-900 to-stone-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-pen-to-square text-[#b01622]"></i>
                <h3 className="font-bold text-sm">Update Production Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setInlineModalRow(null)}
                className="text-stone-400 hover:text-white transition-colors text-sm cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleSaveInlineProduction} className="p-6 space-y-4">
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/80 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-stone-500 font-semibold block text-[10px] uppercase">Work Order</span>
                  <span className="font-mono font-bold text-[#b01622]">{inlineModalRow.work_order_number} ({inlineModalRow.productNo})</span>
                </div>
                <div>
                  <span className="text-stone-500 font-semibold block text-[10px] uppercase">Product Name</span>
                  <span className="font-bold text-stone-900 truncate block">{inlineModalRow.product_name}</span>
                </div>
                <div>
                  <span className="text-stone-500 font-semibold block text-[10px] uppercase">Assigned Qty</span>
                  <span className="font-mono font-bold text-stone-900">{inlineModalRow.required_qty} pc(s)</span>
                </div>
                <div>
                  <span className="text-stone-500 font-semibold block text-[10px] uppercase">Previously Completed</span>
                  <span className="font-mono font-bold text-emerald-700">{inlineModalRow.completed_qty} pc(s)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-stone-700 font-bold mb-1">Newly Completed Qty</label>
                  <input
                    type="number"
                    min="1"
                    max={inlineModalRow.total_in_process || inlineModalRow.pending_qty || 1}
                    value={inlineCompletedNow}
                    onChange={(e) => setInlineCompletedNow(Math.max(1, parseInt(e.target.value || 1, 10)))}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 font-mono text-stone-900 font-bold focus:border-[#b01622]"
                    required
                  />
                  <span className="text-[10px] text-stone-400">
                    Max eligible: {inlineModalRow.total_in_process || inlineModalRow.pending_qty} pc(s)
                    {inlineModalRow.rework_qty > 0 ? ` (${inlineModalRow.pending_qty} balance + ${inlineModalRow.rework_qty} returned)` : ''}
                  </span>
                </div>

                <div>
                  <label className="block text-stone-700 font-bold mb-1">Production Status</label>
                  <select
                    value={inlineProdStatus}
                    onChange={(e) => setInlineProdStatus(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-900 font-bold focus:border-[#b01622]"
                  >
                    <option value="in_progress">In Progress</option>
                    <option value="partially_completed">Partially Completed</option>
                    <option value="production_completed">Production Completed</option>
                    <option value="ready_for_qc">Ready for QC</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-stone-100 pt-3 space-y-3 text-xs">
                <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider block">Physical Weight Breakdown</span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-600 font-semibold mb-0.5">Allocated Metal Wt (g)</label>
                    <input
                      type="text"
                      value={inlineModalRow.allotted_weight.toFixed(3)}
                      readOnly
                      className="w-full bg-stone-100 border border-stone-200 rounded-lg px-3 py-1.5 font-mono text-stone-600 font-bold cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-600 font-semibold mb-0.5">Consumed Metal Wt (g)</label>
                    <input
                      type="text"
                      value={inlineConsumedWeight}
                      onKeyDown={handleDecimalKeyDown}
                      onChange={(e) => setInlineConsumedWeight(sanitizeDecimal(e.target.value))}
                      placeholder="e.g. 12.500"
                      className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 font-mono text-stone-900 focus:border-[#b01622]"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-600 font-semibold mb-0.5">Finished Product Wt (g)</label>
                    <input
                      type="text"
                      value={inlineActualWeight}
                      onKeyDown={handleDecimalKeyDown}
                      onChange={(e) => setInlineActualWeight(sanitizeDecimal(e.target.value))}
                      placeholder="e.g. 12.450"
                      className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 font-mono font-bold text-emerald-800 focus:border-[#b01622]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-stone-600 font-semibold mb-0.5">Stone Wt (g)</label>
                    <input
                      type="text"
                      value={inlineStoneWeight}
                      onKeyDown={handleDecimalKeyDown}
                      onChange={(e) => setInlineStoneWeight(sanitizeDecimal(e.target.value))}
                      placeholder="e.g. 0.250"
                      className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 font-mono text-stone-900 focus:border-[#b01622]"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-600 font-semibold mb-0.5">Recovered Metal (g)</label>
                    <input
                      type="text"
                      value={inlineRecoveredWeight}
                      onKeyDown={handleDecimalKeyDown}
                      onChange={(e) => setInlineRecoveredWeight(sanitizeDecimal(e.target.value))}
                      placeholder="e.g. 0.050"
                      className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 font-mono text-stone-900 focus:border-[#b01622]"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-600 font-semibold mb-0.5">Process Loss / Wastage (g)</label>
                    <input
                      type="text"
                      value={inlineProcessLoss}
                      onKeyDown={handleDecimalKeyDown}
                      onChange={(e) => setInlineProcessLoss(sanitizeDecimal(e.target.value))}
                      placeholder="e.g. 0.020"
                      className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 font-mono text-stone-900 focus:border-[#b01622]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-stone-700 font-semibold text-xs mb-1">Production Remarks / Measurement Notes</label>
                <textarea
                  rows={2}
                  value={inlineRemarks}
                  onChange={(e) => setInlineRemarks(e.target.value)}
                  placeholder="Notes on metal purity, stones, filing or polishing observations..."
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2.5 text-xs text-stone-900 focus:border-[#b01622] resize-none"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setInlineModalRow(null)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-[#b01622] hover:bg-[#8e111a] text-white font-bold text-xs rounded-lg shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-floppy-disk"></i>}
                  <span>Save Production Details</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL OVERLAY: RECORD MANUFACTURING OPERATION */}
      {opModalRow && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-stone-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-900 to-indigo-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-gears text-amber-400"></i>
                <h3 className="font-bold text-sm">Record Manufacturing Operation</h3>
              </div>
              <button
                type="button"
                onClick={() => setOpModalRow(null)}
                className="text-stone-300 hover:text-white transition-colors text-sm cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-100 text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold text-indigo-950 block">{opModalRow.product_name} ({opModalRow.productNo})</span>
                  <span className="font-mono text-stone-500 text-[11px]">{opModalRow.work_order_number} • Karigar: {opModalRow.artisan_name}</span>
                </div>
                <span className="px-2.5 py-1 bg-indigo-200/80 text-indigo-900 font-bold rounded-md text-[10px]">
                  WO Item #{opModalRow.itemId || '1'}
                </span>
              </div>

              <form onSubmit={handleSaveOperation} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-stone-700 font-bold mb-1">Operation Name</label>
                    <select
                      value={opName}
                      onChange={(e) => setOpName(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 font-bold text-stone-900 focus:border-indigo-600"
                    >
                      {operationsMasterList.length > 0 ? (
                        operationsMasterList.map((op) => (
                          <option key={op.id} value={op.name}>
                            {op.name} {op.code ? `(${op.code})` : ''}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="Casting">Casting</option>
                          <option value="Filing">Filing</option>
                          <option value="Soldering">Soldering</option>
                          <option value="Assembly">Assembly</option>
                          <option value="Stone Setting">Stone Setting</option>
                          <option value="Polishing">Polishing</option>
                          <option value="Finishing">Finishing</option>
                          <option value="Other">Other</option>
                        </>
                      )}
                      {opName && !operationsMasterList.some((o) => o.name === opName) && (
                        <option value={opName}>{opName}</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-stone-700 font-bold mb-1">Operation Status</label>
                    <select
                      value={opStatus}
                      onChange={(e) => setOpStatus(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 font-bold text-stone-900 focus:border-indigo-600"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="on_hold">On Hold</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-stone-600 font-semibold mb-1">Processed Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={opProcessedQty}
                      onChange={(e) => setOpProcessedQty(parseInt(e.target.value || 1, 10))}
                      className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 font-mono text-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-600 font-semibold mb-1">Operation Weight (g)</label>
                    <input
                      type="text"
                      value={opWeight}
                      onKeyDown={handleDecimalKeyDown}
                      onChange={(e) => setOpWeight(sanitizeDecimal(e.target.value))}
                      placeholder="e.g. 12.450"
                      className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 font-mono text-stone-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-stone-600 font-semibold mb-1">Assigned Artisan / Staff</label>
                    <input
                      type="text"
                      value={opStaff}
                      onChange={(e) => setOpStaff(e.target.value)}
                      placeholder="Artisan or supervisor name"
                      className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 text-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-600 font-semibold mb-1">Operation Remarks</label>
                    <input
                      type="text"
                      value={opRemarks}
                      onChange={(e) => setOpRemarks(e.target.value)}
                      placeholder="Notes on soldering, polish, setting..."
                      className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 text-stone-900"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs rounded-lg shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-plus"></i>}
                    <span>Save Operation Record</span>
                  </button>
                </div>
              </form>

              {/* Recorded Operations History */}
              <div className="border-t border-stone-200 pt-3">
                <h4 className="text-xs font-bold text-stone-900 mb-2 flex items-center gap-1.5">
                  <i className="fa-solid fa-list-check text-indigo-700"></i>
                  <span>Recorded Operations ({opList.length})</span>
                </h4>
                {opList.length === 0 ? (
                  <p className="text-xs text-stone-400 italic py-3 text-center bg-stone-50 rounded-lg">
                    No manufacturing operations recorded yet for this product.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {opList.map((op) => (
                      <div key={op.id} className="p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs flex items-center justify-between">
                        <div>
                          <span className="font-bold text-stone-900 block">{op.operation_name}</span>
                          <span className="text-[10px] text-stone-500">
                            Qty: {op.processed_qty} | Wt: {op.weight_measurement ? Number(op.weight_measurement).toFixed(3) : '0.000'}g | Staff: {op.assigned_staff || 'Artisan'}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          op.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                          op.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-stone-200 text-stone-700'
                        }`}>
                          {op.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL OVERLAY: PRODUCTION HISTORY & AUDIT TRAIL */}
      {historyModalRow && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-stone-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-clock-rotate-left text-amber-400"></i>
                <h3 className="font-bold text-sm">Production History &amp; Audit Trail</h3>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalRow(null)}
                className="text-stone-300 hover:text-white transition-colors text-sm cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-slate-900 block">{historyModalRow.product_name} ({historyModalRow.productNo})</span>
                <span className="font-mono text-stone-500 text-[11px]">{historyModalRow.work_order_number} • Karigar: {historyModalRow.artisan_name}</span>
              </div>

              {historyTimeline.length === 0 ? (
                <p className="text-xs text-stone-400 italic py-6 text-center">
                  No timeline history events recorded yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {historyTimeline.map((tl, idx) => (
                    <div key={tl.id || idx} className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-900">{tl.stage_label || tl.stage}</span>
                        <span className="text-[10px] text-stone-500 font-mono">{formatTimelineDate(tl.created_at)}</span>
                      </div>
                      <p className="text-stone-600 text-[11px]">{tl.notes || 'No remarks logged.'}</p>
                      <div className="flex items-center justify-between pt-1 border-t border-stone-100 text-[10px] text-stone-500">
                        <span>Updated By: <strong className="text-stone-700">{tl.action_by_name || 'Manager'}</strong></span>
                        <span className="font-mono font-bold text-emerald-800">Completed Wt: {Number(tl.completed_weight_at_step || 0).toFixed(3)}g</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setHistoryModalRow(null)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Close History
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

