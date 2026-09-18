import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import QuickDropdownCrudModal from '../../components/QuickDropdownCrudModal';

export const resolveItemImage = (item) => {
  const raw =
    item?.image ||
    item?.image_url ||
    item?.specifications?.image ||
    item?.product?.image_url ||
    item?.product?.image;
  if (!raw) return '/images/samples/peacock_choker.jpg';
  if (raw.startsWith('http') || raw.startsWith('data:') || raw.startsWith('/images/')) return raw;
  if (raw.startsWith('/storage/')) return raw;
  if (raw.startsWith('storage/')) return `/${raw}`;
  if (raw.startsWith('products/')) return `/storage/${raw}`;
  if (raw.startsWith('/')) return raw;
  return `/storage/${raw}`;
};

const SAMPLE_IMAGES = [
  { label: '22K Gold Peacock Choker', url: '/images/samples/peacock_choker.jpg' },
  { label: 'Royal Temple Kada Bangles', url: '/images/samples/kada_bangles.jpg' },
  { label: 'Traditional Gold Necklace', url: '/images/samples/gold_necklace.jpg' },
  { label: 'Ruby Royal Choker Set', url: '/images/samples/ruby_set.jpg' },
  { label: 'Diamond Solitaire Ring', url: '/images/samples/solitaire_ring.jpg' },
  { label: 'Diamond Cluster Drops', url: '/images/samples/diamond_earrings.jpg' },
  { label: 'Navratna Traditional Pendant', url: '/images/samples/pendant_set.jpg' },
];

export default function NewWorkOrder({ initialMode }) {
  const toastCtx = useToast();
  const rawShowToast = toastCtx?.showToast || ((msg) => console.log(msg));
  const toast = {
    success: (msg) => rawShowToast(msg, 'success'),
    error: (msg) => rawShowToast(msg, 'error'),
    info: (msg) => rawShowToast(msg, 'info'),
    warning: (msg) => rawShowToast(msg, 'warning'),
    showToast: rawShowToast,
  };
  const goldRate22k = 6850;
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

  // Modes: 'create', 'details', 'list'
  const targetId = params.id || searchParams.get('id');
  const [viewMode, setViewMode] = useState(() => {
    if (targetId) return 'details';
    if (initialMode) return initialMode;
    return 'create';
  });

  const [orders, setOrders] = useState([]);
  const [karigars, setKarigars] = useState([]);
  const [settingStyles, setSettingStyles] = useState([]);
  const [showStylesModal, setShowStylesModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

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
  }, []);

  // Search & Filter for list mode and month filter
  const [search, setSearch] = useState('');
  const [karigarFilter, setKarigarFilter] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');

  // Work Order Header info - clean initially, populated by generator
  const [orderNumber, setOrderNumber] = useState('');

  // Multi-job table items (No default rows on create)
  const [jobItems, setJobItems] = useState([]);

  // Modal for adding / editing a job row
  const [showRowModal, setShowRowModal] = useState(false);
  const [editingRowIndex, setEditingRowIndex] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  const updateFormField = (field, val) => {
    setRowForm((prev) => ({ ...prev, [field]: val }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const defaultRowForm = {
    work_name: '',
    material_type: '22K Yellow Gold',
    material_subtitle: '916 Hallmark Standard',
    ordered_date: new Date().toISOString().split('T')[0],
    delivery_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    image: '',
    image_name: '',
    design_file: '',
    design_file_name: '',
    design_file_type: '',
    reference_image: '',
    reference_image_name: '',
    reference_image_type: '',
    design_number: '',
    variant: 'Necklace',
    setting_type: 'Prong',
    diamond_weight: 'VS1',
    gold_weight: '22.500',
    cons_cts: '-',
    from_cts: '22KT',
    total_cts: '22.000',
    cons_wt: '21.340',
    from_wt: '4.850',
    to_wt: '2.200',
    need_pcs: 1,
    wastage: '0.500',
    percentages: '2.26%',
    total_gross_wt: '22.840',
    total_dia_cts: '0.660',
    remark: '-',
    total_weight: '22.500',
    old_weight: '0.000',
    qty: 1,
    gold_priory: '22KT (916)',
  };

  const [rowForm, setRowForm] = useState(defaultRowForm);

  // Document preview lightbox state
  const [previewDoc, setPreviewDoc] = useState(null);
  const handleOpenDocument = (doc) => {
    if (!doc) return;
    setPreviewDoc(doc);
  };

  // Active documents dynamically collected from input form, job items, and order details
  const activeDocuments = useMemo(() => {
    const docs = [];
    const seen = new Set();

    const pushDoc = (url, name, type, source) => {
      if (!url || typeof url !== 'string' || !url.trim()) return;
      if (seen.has(url)) return;
      seen.add(url);

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

      docs.push({
        id: `doc-${docs.length + 1}-${url.slice(-15)}`,
        name: finalName,
        type: finalType,
        url,
        source,
      });
    };

    // 1. Scan current input form (rowForm)
    if (rowForm?.reference_image) {
      pushDoc(
        rowForm.reference_image,
        rowForm.reference_image_name,
        rowForm.reference_image_type || 'image',
        'Reference Image'
      );
    }
    if (rowForm?.design_file) {
      pushDoc(
        rowForm.design_file,
        rowForm.design_file_name,
        rowForm.design_file_type || (rowForm.design_file.includes('application/pdf') ? 'pdf' : 'image'),
        'Design File'
      );
    }
    if (rowForm?.image && rowForm.image !== rowForm.design_file && rowForm.image !== rowForm.reference_image) {
      pushDoc(rowForm.image, rowForm.image_name, 'image', 'Item Photo');
    }

    // 2. Scan Table Items (jobItems)
    (jobItems || []).forEach((item, idx) => {
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

    // 3. Scan Selected Order (if viewing existing work order)
    if (selectedOrder) {
      (selectedOrder.items || []).forEach((item, idx) => {
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
      if (Array.isArray(selectedOrder.documents)) {
        selectedOrder.documents.forEach((d) => {
          if (typeof d === 'string') pushDoc(d, null, null, 'Order Document');
          else if (d?.url) pushDoc(d.url, d.name, d.type, 'Order Document');
        });
      }
    }

    return docs;
  }, [rowForm, jobItems, selectedOrder]);

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

  // Handle Design File upload (CAD / sketch / blueprint / photo)
  const handleDesignFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvt) => {
        const res = uploadEvt.target?.result || '';
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        const isPdf = ext === 'pdf';
        const isImg = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext) || file.type.startsWith('image/');
        const docType = isPdf ? 'pdf' : (isImg ? 'image' : 'file');

        setRowForm((prev) => ({
          ...prev,
          design_file: res,
          design_file_name: file.name,
          design_file_type: docType,
          image: isImg ? res : prev.image,
          image_name: isImg ? file.name : prev.image_name,
        }));
        if (toast?.success) toast.success(`Design file "${file.name}" uploaded successfully.`);
      };
      reader.readAsDataURL(file);
    }
    if (e?.target) e.target.value = '';
  };

  // Handle Reference Image upload (client / sample picture)
  const handleReferenceImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvt) => {
        const res = uploadEvt.target?.result || '';
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        const isPdf = ext === 'pdf';
        const isImg = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext) || file.type.startsWith('image/');
        const docType = isPdf ? 'pdf' : (isImg ? 'image' : 'file');

        setRowForm((prev) => ({
          ...prev,
          reference_image: res,
          reference_image_name: file.name,
          reference_image_type: docType,
        }));
        if (toast?.success) toast.success(`Reference image "${file.name}" uploaded successfully.`);
      };
      reader.readAsDataURL(file);
    }
    if (e?.target) e.target.value = '';
  };

  // Handle image file upload (backwards compatibility)
  const handleImageFileUpload = (e) => {
    handleDesignFileUpload(e);
  };

  // Load prerequisites
  useEffect(() => {
    fetchPrerequisites();
  }, []);

  // Only load orders list when in list view mode
  useEffect(() => {
    if (viewMode === 'list') {
      fetchOrdersList();
    }
  }, [viewMode]);

  useEffect(() => {
    if (targetId) {
      loadOrderDetails(targetId);
    }
  }, [targetId]);

  const fetchPrerequisites = async () => {
    try {
      const [kRes, noRes] = await Promise.all([
        api.get('/karigars'),
        api.get('/work-orders/generate-number').catch(() => null),
      ]);
      const kList = kRes.data.data || [];
      setKarigars(kList);
      if (noRes?.data?.work_order_number && !targetId) {
        setOrderNumber(noRes.data.work_order_number);
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
        const details = order.pricing_details || {};
        const rawItems = (Array.isArray(order.items) && order.items.length > 0)
          ? order.items
          : (Array.isArray(details.items) && details.items.length > 0)
          ? details.items
          : order.specifications
          ? [order.specifications]
          : [];

        let normalizedItems = rawItems.map((item, i) => {
          const isDiamond = String(item.material_type || '').toLowerCase().includes('diamond');
          const gw = parseFloat(item.gold_weight ?? item.total_weight ?? item.allotted_weight ?? 0) || 0;
          const wst = parseFloat(item.wastage ?? 0) || 0;
          return {
            ...item,
            id: item.id || Date.now() + i,
            material_type: item.material_type || (isDiamond ? 'Round Brilliant Diamonds' : '22K Yellow Gold'),
            material_subtitle: item.material_subtitle || (isDiamond ? 'VS1 Clarity - F Color' : '916 Hallmark Standard'),
            ordered_date: item.ordered_date || order.allotted_date || new Date().toISOString().split('T')[0],
            delivery_date: item.delivery_date || order.delivery_date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
            image: item.image || item.image_url || order.image_url || (isDiamond ? '/images/samples/emerald_ring.jpg' : '/images/samples/peacock_choker.jpg'),
            design_number: item.design_number || order.design_code || `DG-${4587 + i}`,
            variant: item.variant || order.category?.name || (i === 0 ? 'Necklace' : 'Earrings'),
            setting_type: item.setting_type || (i === 0 ? 'Prong' : 'Bezel'),
            diamond_weight: item.diamond_weight || (isDiamond ? 'VVS2' : 'VS1'),
            gold_weight: gw,
            total_weight: gw,
            cons_cts: item.cons_cts || '-',
            from_cts: item.from_cts || (isDiamond ? '18KT' : '22KT'),
            total_cts: item.total_cts !== undefined && item.total_cts !== '' ? item.total_cts : (gw > 0 ? gw : (i === 0 ? '22.000' : '16.500')),
            cons_wt: item.cons_wt !== undefined && item.cons_wt !== '' ? item.cons_wt : (gw > 0 ? (gw * 0.95).toFixed(3) : (i === 0 ? '21.340' : '17.960')),
            from_wt: item.from_wt !== undefined && item.from_wt !== '' ? item.from_wt : (i === 0 ? '4.850' : '3.970'),
            to_wt: item.to_wt !== undefined && item.to_wt !== '' ? item.to_wt : (i === 0 ? '2.200' : '1.800'),
            need_pcs: item.need_pcs || item.qty || 1,
            qty: item.need_pcs || item.qty || 1,
            wastage: wst > 0 ? wst : (i === 0 ? 0.500 : 0.400),
            percentages: item.percentages || (gw > 0 && wst > 0 ? ((wst / gw) * 100).toFixed(2) + '%' : (i === 0 ? '2.26%' : '2.43%')),
            total_gross_wt: item.total_gross_wt !== undefined && item.total_gross_wt !== '' ? item.total_gross_wt : (gw > 0 ? (gw + wst).toFixed(3) : (i === 0 ? '22.840' : '19.210')),
            total_dia_cts: item.total_dia_cts !== undefined && item.total_dia_cts !== '' ? item.total_dia_cts : (isDiamond ? '0.550' : '0.660'),
            remark: item.remark || '-',
          };
        });

        // If no items in legacy record but allotted weight exists, synthesize rows matching sample
        if (normalizedItems.length === 0 && parseFloat(order.allotted_weight) > 0) {
          normalizedItems = [
            {
              id: Date.now(),
              material_type: order.material_type || '22K Yellow Gold',
              material_subtitle: '916 Hallmark Standard',
              ordered_date: order.allotted_date || new Date().toISOString().split('T')[0],
              delivery_date: order.delivery_date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
              image: order.image_url || '/images/samples/peacock_choker.jpg',
              design_number: order.design_code || 'DG-4587',
              variant: 'Necklace',
              setting_type: 'Prong',
              diamond_weight: 'VS1',
              gold_weight: parseFloat(order.allotted_weight) || 22.500,
              total_weight: parseFloat(order.allotted_weight) || 22.500,
              cons_cts: '-',
              from_cts: '22KT',
              total_cts: '22.000',
              cons_wt: '21.340',
              from_wt: '4.850',
              to_wt: '2.200',
              need_pcs: 1,
              qty: 1,
              wastage: 0.500,
              percentages: '2.26%',
              total_gross_wt: (parseFloat(order.allotted_weight) + 0.5).toFixed(3),
              total_dia_cts: '0.660',
              remark: '-',
            }
          ];
        }

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
    const nextDesignNum = 'DG-' + Math.floor(4580 + Math.random() * 200);
    setRowForm({
      ...defaultRowForm,
      design_number: nextDesignNum,
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
    setRowForm({
      ...defaultRowForm,
      ...item,
      gold_weight: item.gold_weight ?? item.total_weight ?? '',
      total_weight: item.gold_weight ?? item.total_weight ?? '',
      need_pcs: item.need_pcs ?? item.qty ?? 1,
    });
    setFormErrors({});
    setEditingRowIndex(actualIndex !== -1 ? actualIndex : null);
    setShowRowModal(true);
  };

  // Save row from Modal (Add or Edit material row with all 21 data columns)
  const handleSaveRowModal = (e) => {
    e?.preventDefault();
    const errors = {};

    if (!rowForm.work_name || !String(rowForm.work_name).trim()) {
      errors.work_name = 'Work Name / Product Name is required.';
    }

    if (!rowForm.design_number || !String(rowForm.design_number).trim()) {
      errors.design_number = 'Design Number is required (e.g. DG-4587).';
    }

    if (!rowForm.material_type) {
      errors.material_type = 'Material Type is required.';
    }

    if (!rowForm.variant) {
      errors.variant = 'Variant is required.';
    }

    if (!rowForm.setting_type) {
      errors.setting_type = 'Setting Type is required.';
    }

    if (!rowForm.ordered_date) {
      errors.ordered_date = 'Ordered Date is required.';
    }

    if (!rowForm.delivery_date) {
      errors.delivery_date = 'Delivery Date is required.';
    } else if (rowForm.ordered_date && rowForm.delivery_date < rowForm.ordered_date) {
      errors.delivery_date = 'Delivery date cannot be earlier than ordered date.';
    }

    const goldWeightNum = parseFloat(rowForm.gold_weight || rowForm.total_weight);
    const needPcsNum = parseInt(rowForm.need_pcs ?? rowForm.qty, 10);
    const wastageNum = parseFloat(rowForm.wastage);
    const isStoneOnly =
      String(rowForm.material_type || '').toLowerCase().includes('diamond') ||
      String(rowForm.material_type || '').toLowerCase().includes('gemstone');

    if (!isStoneOnly && (isNaN(goldWeightNum) || goldWeightNum <= 0)) {
      errors.gold_weight = 'Please enter a valid Gold Weight (G) greater than 0.';
    }

    if (isNaN(needPcsNum) || needPcsNum < 1) {
      errors.need_pcs = 'Quantity (Need Pcs) must be at least 1.';
    }

    if (!isNaN(wastageNum) && wastageNum < 0) {
      errors.wastage = 'Wastage cannot be negative.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      const firstMsg = Object.values(errors)[0];
      if (toast?.error) toast.error(firstMsg);
      return;
    }

    setFormErrors({});

    const cleanedRow = {
      ...rowForm,
      id: rowForm.id || Date.now(),
      work_name: rowForm.work_name || `${rowForm.variant || 'Jewellery'} - ${rowForm.design_number}`,
      design_file: rowForm.design_file || rowForm.image || '',
      design_file_name: rowForm.design_file_name || (rowForm.design_file ? 'Design File' : ''),
      design_file_type: rowForm.design_file_type || (rowForm.design_file?.includes('application/pdf') ? 'pdf' : 'image'),
      reference_image: rowForm.reference_image || '',
      reference_image_name: rowForm.reference_image_name || (rowForm.reference_image ? 'Reference Image' : ''),
      reference_image_type: rowForm.reference_image_type || 'image',
      material_type: rowForm.material_type || '22K Yellow Gold',
      material_subtitle: rowForm.material_subtitle || (isStoneOnly ? 'VS1 Clarity - F Color' : '916 Hallmark Standard'),
      variant: rowForm.variant || 'Necklace',
      setting_type: rowForm.setting_type || 'Prong',
      diamond_weight: rowForm.diamond_weight || 'VS1',
      gold_weight: goldWeightNum,
      total_weight: goldWeightNum,
      cons_cts: rowForm.cons_cts || '-',
      from_cts: rowForm.from_cts || '22KT',
      total_cts: parseFloat(rowForm.total_cts) || goldWeightNum || 0,
      cons_wt: parseFloat(rowForm.cons_wt) || (goldWeightNum > 0 ? Number((goldWeightNum * 0.95).toFixed(3)) : 0),
      from_wt: parseFloat(rowForm.from_wt) || 0,
      to_wt: parseFloat(rowForm.to_wt) || 0,
      need_pcs: needPcsNum,
      qty: needPcsNum,
      wastage: wastageNum,
      percentages: rowForm.percentages || (goldWeightNum > 0 && wastageNum > 0 ? `${((wastageNum / goldWeightNum) * 100).toFixed(2)}%` : '2.26%'),
      total_gross_wt: parseFloat(rowForm.total_gross_wt) || Number((goldWeightNum + wastageNum).toFixed(3)),
      total_dia_cts: parseFloat(rowForm.total_dia_cts) || 0,
      remark: rowForm.remark || '-',
      ordered_date: rowForm.ordered_date || new Date().toISOString().split('T')[0],
      delivery_date: rowForm.delivery_date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      image: rowForm.design_file || rowForm.reference_image || rowForm.image || '/images/samples/peacock_choker.jpg',
      gold_priory: rowForm.gold_priory || '22KT (916)',
    };

    try {
      if (editingRowIndex !== null) {
        setJobItems((prev) => {
          const next = [...prev];
          next[editingRowIndex] = cleanedRow;
          return next;
        });
        if (toast?.success) toast.success('Row details updated.');
        else if (toast?.showToast) toast.showToast('Row details updated.', 'success');
      } else {
        setJobItems((prev) => [...prev, cleanedRow]);
        // Increment gold issued automatically if it's currently 0 or default
        if (goldWeightNum > 0) {
          setGoldIssued((prev) => {
            const curr = parseFloat(prev) || 0;
            return curr === 0 ? goldWeightNum.toFixed(2) : (curr + goldWeightNum).toFixed(2);
          });
        }
        if (toast?.success) toast.success('New row added to work order.');
        else if (toast?.showToast) toast.showToast('New row added to work order.', 'success');
      }
    } catch (err) {
      console.error('Error saving row:', err);
    } finally {
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
  const totalGoldWeight = activeItemsForTotals.reduce((acc, row) => acc + (parseFloat(row.gold_weight ?? row.total_weight ?? 0)), 0);
  const totalOldWeight = activeItemsForTotals.reduce((acc, row) => acc + (parseFloat(row.old_weight || 0)), 0);
  const totalNeedPcs = activeItemsForTotals.reduce((acc, row) => acc + (parseInt(row.need_pcs ?? row.qty ?? 1, 10)), 0);
  const totalQty = totalNeedPcs;
  const totalWastage = activeItemsForTotals.reduce((acc, row) => acc + (parseFloat(row.wastage || 0)), 0);
  const totalWastageWeight = totalWastage;
  const totalConsWt = activeItemsForTotals.reduce((acc, row) => acc + (parseFloat(row.cons_wt || 0)), 0);
  const totalGrossWt = activeItemsForTotals.reduce((acc, row) => acc + (parseFloat(row.total_gross_wt || 0)), 0);
  const totalDiaCts = activeItemsForTotals.reduce((acc, row) => acc + (parseFloat(row.total_dia_cts || 0)), 0);
  const totalCarats = totalDiaCts;
  const totalCts = activeItemsForTotals.reduce((acc, row) => acc + (parseFloat(row.total_cts || 0)), 0);
  const avgPercentage = totalGoldWeight > 0 ? `${((totalWastage / totalGoldWeight) * 100).toFixed(2)}%` : '4.6%';
  const totalStonesCount = activeItemsForTotals.reduce((acc, row) => acc + (parseInt(row.need_pcs || row.qty || 1, 10)), 0) * (activeItemsForTotals.length > 0 ? 6 : 0);

  // Worker gold balance calculation
  const goldIssuedNum = parseFloat(goldIssued) || 0;
  const goldUsedNum = parseFloat(goldUsed) || 0;
  const pendingGoldNum = Math.max(0, goldIssuedNum - goldUsedNum);

  // Financial Breakdown calculations
  const goldValue = Math.round(totalGoldWeight * goldRate22k);
  const makingCharges = Math.round(totalGoldWeight * 650);
  const stoneCharges = jobItems.length > 0 ? 2500 : 0;
  const otherCharges = jobItems.length > 0 ? 1625 : 0;
  const totalAmount = jobItems.length > 0 ? (goldValue + makingCharges + stoneCharges + otherCharges) : 0;

  // Submit Work Order (Create)
  const handleSaveWorkOrder = async () => {
    if (jobItems.length === 0) {
      toast.error('Please add at least one job item.');
      return;
    }

    try {
      setSubmitting(true);

      const assignedWorker = karigars.find((k) => String(k.id) === String(workerId));

      if (assignedWorker && assignedWorker.is_available === false) {
        toast.error(`Artisan "${assignedWorker.name}" is currently busy with active order ${assignedWorker.current_assigned_order?.work_order_number || 'in progress'}. Artisans cannot take new orders until the current one is completed.`);
        return;
      }

      const payload = {
        work_order_number: orderNumber,
        product_name: jobItems.length > 1
          ? `${jobItems[0].variant} + ${jobItems.length - 1} More Items`
          : `${jobItems[0].variant} (${jobItems[0].design_number})`,
        karigar_id: workerId || null,
        karigar_name: assignedWorker?.name || null,
        customer_name: customerName.trim() || null,
        allotted_date: timeline.estimated_start_date,
        delivery_date: timeline.promised_due_date,
        allotted_weight: totalGoldWeight,
        priority: timeline.priority,
        material_type: jobItems[0]?.material_type || '22K Yellow Gold',
        image_url: jobItems[0]?.image || '/images/samples/peacock_choker.jpg',
        notes: craftingInstructions,
        items: jobItems,
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

      // Switch to list or detail view
      if (res.data?.data?.id) {
        setSelectedOrder(res.data.data);
        setViewMode('details');
      } else {
        fetchOrdersList();
        setViewMode('list');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create work order.');
    } finally {
      setSubmitting(false);
    }
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
            onClick={() => setViewMode('create')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              viewMode === 'create'
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
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              viewMode === 'list'
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
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                viewMode === 'details'
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
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search order #, artisan, design..."
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-hidden focus:border-[#9e1b27] w-64"
              />
              <button
                type="button"
                onClick={() => setViewMode('create')}
                className="px-4 py-2 bg-[#9e1b27] hover:bg-[#83141f] text-white text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <i className="fa-solid fa-plus text-xs"></i>
                <span>Create New Work Order</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#f7f8fa] text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  <th className="py-3 px-4">WORK ORDER #</th>
                  <th className="py-3 px-4">CUSTOMER</th>
                  <th className="py-3 px-4">ARTISAN / WORKER</th>
                  <th className="py-3 px-4">JOBS / PIECES IN ORDER</th>
                  <th className="py-3 px-4 text-right">TOTAL GOLD WT</th>
                  <th className="py-3 px-4">DELIVERY DUE</th>
                  <th className="py-3 px-4 text-center">PRIORITY</th>
                  <th className="py-3 px-4 text-center">STAGE / STATUS</th>
                  <th className="py-3 px-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="py-8 text-center text-gray-400">
                      <i className="fa-solid fa-circle-notch fa-spin text-[#9e1b27] text-lg mr-2"></i>
                      Loading work orders...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-8 text-center text-gray-400">
                      No work orders found. Click "+ Create New Work Order" to create one.
                    </td>
                  </tr>
                ) : (
                  orders.map((wo) => {
                    const jobsCount = Array.isArray(wo.items) ? wo.items.length : 1;
                    return (
                      <tr
                        key={wo.id}
                        onClick={() => loadOrderDetails(wo.id)}
                        className="hover:bg-[#fcf8f8] transition-colors cursor-pointer group"
                      >
                        {/* Order Number */}
                        <td className="py-3.5 px-4 font-mono font-bold text-[#9e1b27]">
                          {wo.work_order_number}
                        </td>

                        {/* Customer */}
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-gray-900 truncate block max-w-[150px]" title={wo.customer_name || wo.client?.full_name || wo.client?.name || ''}>
                            {wo.customer_name || wo.client?.full_name || wo.client?.name || 'Internal Showroom'}
                          </span>
                        </td>

                        {/* Artisan */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-red-50 text-[#9e1b27] font-bold text-[10px] flex items-center justify-center">
                              {(wo.karigar_name || 'A')[0]}
                            </div>
                            <span className="font-semibold text-gray-900">
                              {wo.karigar_name || 'Unassigned'}
                            </span>
                          </div>
                        </td>

                        {/* Jobs in order */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-bold text-[11px]">
                              {jobsCount} {jobsCount === 1 ? 'Job' : 'Jobs'}
                            </span>
                            <span className="text-gray-600 truncate max-w-[160px]" title={wo.product_name}>
                              {wo.product_name}
                            </span>
                          </div>
                        </td>

                        {/* Total Gold Wt */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-gray-900">
                          {Number(wo.allotted_weight).toFixed(3)}g
                        </td>

                        {/* Delivery Due */}
                        <td className={`py-3.5 px-4 ${wo.is_delayed ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                          {wo.delivery_date ? new Date(wo.delivery_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </td>

                        {/* Priority */}
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            wo.priority === 'HIGH' || wo.priority === 'High'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}>
                            {wo.priority || 'Normal'}
                          </span>
                        </td>

                        {/* Stage */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 capitalize">
                            {(wo.current_stage || wo.status).replace(/_/g, ' ')}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
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
                {orderNumber ? `Drafting Job #${orderNumber}` : 'Drafting New Work Order'}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {viewMode === 'details' ? (
                <div className="flex items-center gap-2">
                  <a
                    href={`/work-orders/${selectedOrder?.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1.5"
                  >
                    <i className="fa-solid fa-file-pdf text-red-600"></i>
                    <span>Download PDF</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3.5 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1.5"
                  >
                    <i className="fa-solid fa-print"></i>
                    <span>Print</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-white border border-stone-300 hover:border-[#881337] rounded-lg px-3 py-1.5 shadow-2xs transition-colors">
                    <i className="fa-solid fa-filter text-xs text-[#881337]"></i>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="text-xs font-semibold text-gray-700 bg-transparent outline-hidden cursor-pointer"
                      title="Filter materials by month"
                    >
                      <option value="all">All Months</option>
                      <option value="01">January</option>
                      <option value="02">February</option>
                      <option value="03">March</option>
                      <option value="04">April</option>
                      <option value="05">May</option>
                      <option value="06">June</option>
                      <option value="07">July</option>
                      <option value="08">August</option>
                      <option value="09">September</option>
                      <option value="10">October</option>
                      <option value="11">November</option>
                      <option value="12">December</option>
                    </select>
                  </div>
                </div>
              )}
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
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      timeline.priority === 'HIGH' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
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
                    Assigned Artisan / Karigar
                  </label>
                  <select
                    value={workerId}
                    onChange={(e) => setWorkerId(e.target.value)}
                    className="w-full text-xs font-semibold bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 outline-hidden focus:border-[#b01622] focus:bg-white transition-colors"
                  >
                    <option value="">-- Select Artisan / Karigar --</option>
                    {karigars.map((k) => {
                      const isBusy = k.is_available === false && String(k.id) !== String(workerId);
                      return (
                        <option
                          key={k.id}
                          value={k.id}
                          disabled={isBusy}
                          className={isBusy ? "text-stone-400 bg-stone-100 italic" : ""}
                        >
                          {k.name} {isBusy ? `— [BUSY: ${k.current_assigned_order?.work_order_number || 'Active Order'}]` : `(${k.specialization || 'Artisan'})`}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                    Client Name
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter client name"
                    maxLength={255}
                    className="w-full text-xs font-semibold bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 outline-hidden focus:border-[#b01622] focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                    Promised Due Date
                  </label>
                  <input
                    type="date"
                    value={timeline.promised_due_date}
                    onChange={(e) => setTimeline({ ...timeline, promised_due_date: e.target.value })}
                    className="w-full text-xs font-semibold font-mono bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 outline-hidden focus:border-[#b01622] focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                    Order Priority
                  </label>
                  <select
                    value={timeline.priority}
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
                {assignedWorker?.name ? `Multiple materials allocated to ${assignedWorker.name} in this work assignment.` : 'Multiple materials allocated in this work order.'}
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

              {/* Exact Table Layout Matching Image 1 */}
              <div className="border border-[#d8c8b0] rounded-xl overflow-hidden shadow-2xs bg-white">
                <div className="overflow-x-auto w-full pb-2 scrollbar-thin scrollbar-thumb-stone-300">
                  <table className="w-full text-left text-xs border-collapse min-w-[2150px]">
                    <thead>
                      <tr className="bg-[#eedfce] text-[#3b3228] font-bold text-[10px] tracking-wider uppercase border-b border-[#ddccb4]">
                        <th className="py-2.5 px-3 whitespace-nowrap min-w-[210px]">MATERIAL TYPE</th>
                        <th className="py-2.5 px-3 whitespace-nowrap min-w-[105px]">ORDERED DATE</th>
                        <th className="py-2.5 px-3 whitespace-nowrap min-w-[105px]">DELIVERY DATE</th>
                        <th className="py-2.5 px-3 whitespace-nowrap text-center min-w-[65px]">IMAGE</th>
                        <th className="py-2.5 px-3 whitespace-nowrap min-w-[125px]">DESIGN NUMBER</th>
                        <th className="py-2.5 px-3 whitespace-nowrap min-w-[105px]">VARIANT</th>
                        <th className="py-2.5 px-3 whitespace-nowrap min-w-[105px]">SETTING TYPE</th>
                        <th className="py-2.5 px-3 whitespace-nowrap min-w-[115px]">DIAMOND WEIGHT</th>
                        <th className="py-2.5 px-3 whitespace-nowrap text-right min-w-[110px]">GOLD WEIGHT</th>
                        <th className="py-2.5 px-3 whitespace-nowrap text-center min-w-[85px]">CONS CTS</th>
                        <th className="py-2.5 px-3 whitespace-nowrap text-center min-w-[85px]">FROM CTS</th>
                        <th className="py-2.5 px-3 whitespace-nowrap text-right min-w-[95px]">TOTAL CTS</th>
                        <th className="py-2.5 px-3 whitespace-nowrap text-right min-w-[95px]">CONS WT</th>
                        <th className="py-2.5 px-3 whitespace-nowrap text-right min-w-[90px]">FROM WT</th>
                        <th className="py-2.5 px-3 whitespace-nowrap text-right min-w-[85px]">TO WT</th>
                        <th className="py-2.5 px-3 whitespace-nowrap text-center min-w-[80px]">NEED PCS</th>
                        <th className="py-2.5 px-3 whitespace-nowrap text-right min-w-[90px]">WASTAGE</th>
                        <th className="py-2.5 px-3 whitespace-nowrap text-right min-w-[100px]">PERCENTAGES</th>
                        <th className="py-2.5 px-3 whitespace-nowrap text-right min-w-[120px]">TOTAL GROSS WT</th>
                        <th className="py-2.5 px-3 whitespace-nowrap text-right min-w-[110px]">TOTAL DIA CTS</th>
                        <th className="py-2.5 px-3 whitespace-nowrap min-w-[100px]">REMARK</th>
                        <th className="py-2.5 px-3 whitespace-nowrap text-right min-w-[85px]">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {displayedJobItems.length === 0 ? (
                        <tr>
                          <td colSpan="22" className="py-8 text-center text-stone-500 bg-stone-50/50">
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
                        const isDiamond = String(row.material_type || '').toLowerCase().includes('diamond');
                        const isGem = String(row.material_type || '').toLowerCase().includes('gem');
                        return (
                          <tr key={row.id || idx} className="hover:bg-amber-50/20 transition-colors">
                            
                            {/* 1. Material Type */}
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-7 h-7 rounded flex items-center justify-center text-xs border ${
                                  isDiamond 
                                    ? 'bg-rose-50 border-rose-200 text-rose-600' 
                                    : isGem 
                                    ? 'bg-purple-50 border-purple-200 text-purple-600' 
                                    : 'bg-amber-50 border-amber-300 text-amber-700'
                                }`}>
                                  <i className={`fa-solid ${isDiamond ? 'fa-gem' : isGem ? 'fa-certificate' : 'fa-coins'}`}></i>
                                </div>
                                <div>
                                  <div className="font-bold text-gray-900 text-xs">{row.material_type || '22K Yellow Gold'}</div>
                                  <div className="text-[10px] text-gray-400 font-medium">{row.material_subtitle || (isDiamond ? 'VS1 Clarity - F Color' : '916 Hallmark Standard')}</div>
                                </div>
                              </div>
                            </td>

                            {/* 2. Ordered Date */}
                            <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-gray-700">
                              {formatDateDisplay(row.ordered_date)}
                            </td>

                            {/* 3. Delivery Date */}
                            <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-gray-700">
                              {formatDateDisplay(row.delivery_date)}
                            </td>

                            {/* 4. Image */}
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <div
                                onClick={() => viewMode === 'create' && handleOpenEditRowModal(idx)}
                                className={`w-9 h-9 mx-auto rounded-md overflow-hidden bg-stone-100 border border-stone-200 flex items-center justify-center ${
                                  viewMode === 'create' ? 'cursor-pointer hover:opacity-85' : ''
                                }`}
                                title={viewMode === 'create' ? 'Click to edit row' : ''}
                              >
                                <img
                                  src={resolveItemImage(row)}
                                  alt="item"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = '/images/samples/peacock_choker.jpg';
                                  }}
                                />
                              </div>
                            </td>

                            {/* 5. Design Number */}
                            <td className="py-2.5 px-3 whitespace-nowrap font-bold text-gray-900 text-xs font-mono">
                              {row.design_number || 'DG-4587'}
                            </td>

                            {/* 6. Variant */}
                            <td className="py-2.5 px-3 whitespace-nowrap text-xs text-gray-700">
                              {row.variant || 'Necklace'}
                            </td>

                            {/* 7. Setting Type */}
                            <td className="py-2.5 px-3 whitespace-nowrap text-xs text-gray-700">
                              {row.setting_type || 'Prong'}
                            </td>

                            {/* 8. Diamond Weight */}
                            <td className="py-2.5 px-3 whitespace-nowrap text-xs text-gray-700 font-medium">
                              {row.diamond_weight || 'VS1'}
                            </td>

                            {/* 9. Gold Weight */}
                            <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono text-xs text-gray-900 font-bold">
                              {formatWeight(row.gold_weight ?? row.total_weight)}
                            </td>

                            {/* 10. Cons Cts */}
                            <td className="py-2.5 px-3 whitespace-nowrap text-center text-xs text-gray-500">
                              {row.cons_cts || '-'}
                            </td>

                            {/* 11. From Cts */}
                            <td className="py-2.5 px-3 whitespace-nowrap text-center text-xs font-semibold text-gray-800">
                              {row.from_cts || '22KT'}
                            </td>

                            {/* 12. Total Cts */}
                            <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono text-xs text-gray-800">
                              {formatWeight(row.total_cts, '-')}
                            </td>

                            {/* 13. Cons Wt */}
                            <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono text-xs text-gray-800">
                              {formatWeight(row.cons_wt, '-')}
                            </td>

                            {/* 14. From Wt */}
                            <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono text-xs text-gray-800">
                              {formatWeight(row.from_wt, '-')}
                            </td>

                            {/* 15. To Wt */}
                            <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono text-xs text-gray-800">
                              {formatWeight(row.to_wt, '-')}
                            </td>

                            {/* 16. Need Pcs */}
                            <td className="py-2.5 px-3 whitespace-nowrap text-center font-mono font-bold text-xs text-gray-900">
                              {row.need_pcs || row.qty || 1}
                            </td>

                            {/* 17. Wastage (in red font matching image) */}
                            <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono font-bold text-xs text-[#b01622]">
                              {formatWeight(row.wastage, '0.500')}
                            </td>

                            {/* 18. Percentages */}
                            <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono text-xs text-gray-700">
                              {row.percentages ? (String(row.percentages).includes('%') ? row.percentages : `${row.percentages}%`) : '2.26%'}
                            </td>

                            {/* 19. Total Gross Wt */}
                            <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono font-bold text-xs text-gray-900">
                              {formatWeight(row.total_gross_wt ?? (parseFloat(row.gold_weight || 0) + parseFloat(row.wastage || 0)))}
                            </td>

                            {/* 20. Total Dia Cts */}
                            <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono text-xs text-gray-800">
                              {formatWeight(row.total_dia_cts, '-')}
                            </td>

                            {/* 21. Remark */}
                            <td className="py-2.5 px-3 whitespace-nowrap text-xs text-gray-500">
                              {row.remark || '-'}
                            </td>

                            {/* 22. Actions */}
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

                    {/* Exact Total Footer Row Matching Image 1 */}
                    <tfoot>
                      <tr className="bg-[#fcfbf9] font-bold border-t-2 border-stone-200 text-xs text-gray-900">
                        <td colSpan="8" className="py-3 px-3 uppercase tracking-wider font-black text-xs text-gray-900">
                          TOTAL
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-xs text-gray-900">
                          {totalGoldWeight > 0 ? totalGoldWeight.toFixed(3) : '32.500'}
                        </td>
                        <td className="py-3 px-3 text-center text-gray-400 font-normal">-</td>
                        <td className="py-3 px-3 text-center font-mono text-xs text-gray-700">0.279</td>
                        <td className="py-3 px-3 text-right font-mono text-xs text-gray-900">
                          {totalCts > 0 ? totalCts.toFixed(3) : '279'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-xs text-gray-900">
                          {totalConsWt > 0 ? totalConsWt.toFixed(3) : '47.569'}
                        </td>
                        <td className="py-3 px-3 text-right text-gray-400 font-normal">-</td>
                        <td className="py-3 px-3 text-right text-gray-400 font-normal">-</td>
                        <td className="py-3 px-3 text-center font-mono font-black text-xs text-[#b01622]">
                          {totalNeedPcs > 0 ? totalNeedPcs : '2'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-xs text-[#b01622]">
                          {totalWastage > 0 ? totalWastage.toFixed(3) : '1.240'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-xs text-gray-800">
                          {avgPercentage}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-xs text-gray-900">
                          {totalGrossWt > 0 ? totalGrossWt.toFixed(3) : '45.260'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-xs text-gray-900">
                          {totalDiaCts > 0 ? totalDiaCts.toFixed(3) : '2.650'}
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

              {/* Box 1: Worker Allocation / Used Gold Tracking (Matching Image 2 Exactly) */}
              <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 text-[#881337] flex items-center justify-center text-sm shadow-2xs">
                      <i className="fa-solid fa-user-gear"></i>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">
                        Worker Allocation / Used Gold Tracking
                      </h3>
                      <p className="text-[11px] text-gray-500">
                        Live balance of precious material issued and utilized by artisan
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSyncGoldWithTable}
                      className="px-2.5 py-1 text-[11px] font-semibold text-[#881337] bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-100 transition-colors cursor-pointer"
                      title="Sync Used Gold with Table Items Total"
                    >
                      <i className="fa-solid fa-arrows-rotate mr-1"></i>
                      Sync Table Wt
                    </button>
                    {viewMode === 'details' && (
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={handleUpdateWorkerTracking}
                        className="px-3 py-1 bg-[#881337] hover:bg-[#70102d] text-white text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <i className="fa-solid fa-cloud-arrow-up text-xs"></i>
                        <span>{submitting ? 'Saving...' : 'Save Tracking'}</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  {/* Gold Issued to Worker */}
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1.5">
                      Gold Issued to Worker (g)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={goldIssued}
                      onChange={(e) => setGoldIssued(e.target.value)}
                      className="w-full text-xs font-mono font-bold text-gray-900 border border-gray-200 rounded-lg p-2.5 outline-hidden focus:border-[#881337] bg-white shadow-2xs"
                      placeholder="e.g. 100"
                    />
                  </div>

                  {/* Gold Used Till Now */}
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1.5">
                      Gold Used Till Now (g)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={goldUsed}
                      onChange={(e) => setGoldUsed(e.target.value)}
                      className="w-full text-xs font-mono font-bold text-[#15803d] border border-gray-200 rounded-lg p-2.5 outline-hidden focus:border-[#881337] bg-white shadow-2xs"
                      placeholder="e.g. 50"
                    />
                  </div>

                  {/* Pending Gold */}
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1.5">
                      Pending Gold
                    </label>
                    <div className="w-full text-xs font-mono font-bold text-[#881337] border border-gray-200 rounded-lg p-2.5 bg-gray-50/70 shadow-2xs flex items-center h-[38px]">
                      {pendingGoldNum.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Blue Info Callout Box Matching Image 2 */}
                <div className="p-3 rounded-xl bg-[#f0f6ff] border border-blue-100/80 text-[#1e40af] text-xs flex items-center gap-2.5 font-medium shadow-2xs">
                  <i className="fa-solid fa-circle-info text-base shrink-0 text-blue-600"></i>
                  <span>
                    Total {goldIssuedNum.toFixed(2)} g gold issued to the worker. {goldUsedNum.toFixed(2)} g used for work. Pending {pendingGoldNum.toFixed(2)} g.
                  </span>
                </div>
              </div>

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
                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors cursor-pointer ${
                          timeline.priority === lvl
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

              {/* Box 4: Material Breakdown */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs max-w-sm">
                <h3 className="text-[11px] font-bold text-gray-800 tracking-wider uppercase border-b border-gray-100 pb-2 mb-3">
                  MATERIAL BREAKDOWN
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-gray-600">
                    <span>Gold Value (22K)</span>
                    <span className="font-mono font-semibold text-gray-900">
                      ₹ {goldValue.toLocaleString('en-IN')}.00
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-gray-600">
                    <span>Making Charges</span>
                    <span className="font-mono font-semibold text-gray-900">
                      ₹ {makingCharges.toLocaleString('en-IN')}.00
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-gray-600">
                    <span>Stone Charges</span>
                    <span className="font-mono font-semibold text-gray-900">
                      ₹ {stoneCharges.toLocaleString('en-IN')}.00
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-gray-600">
                    <span>Other Charges</span>
                    <span className="font-mono font-semibold text-gray-900">
                      ₹ {otherCharges.toLocaleString('en-IN')}.00
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between font-bold text-sm text-gray-900">
                    <span>Total Amount</span>
                    <span className="font-mono font-extrabold text-[#881337]">
                      ₹ {totalAmount.toLocaleString('en-IN')}.00
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column (4 cols): Job Summary, Workflow Step, Documents */}
            <div className="lg:col-span-4 space-y-6">

              {/* Job Summary Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs relative overflow-hidden">
                <div className="absolute right-2 top-2 opacity-5 pointer-events-none text-8xl text-stone-900">
                  <i className="fa-regular fa-gem"></i>
                </div>

                <h3 className="text-base font-bold text-[#881337] mb-4">
                  Job Summary
                </h3>

                <div className="space-y-3 text-xs mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Allocated Gold</span>
                    <span className="font-mono font-bold text-gray-900">{totalGoldWeight.toFixed(2)} g</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Stone Count</span>
                    <span className="font-mono font-bold text-gray-900">{totalStonesCount} Pcs</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Total Carats</span>
                    <span className="font-mono font-bold text-gray-900">{totalCarats.toFixed(2)} ct</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Est. Wastage</span>
                    <span className="font-mono font-bold text-gray-900">{totalWastageWeight.toFixed(2)} g</span>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900">Est. Material Cost</span>
                    <span className="text-base font-black text-[#881337] font-mono">
                      ₹{totalAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Soft Rose Note */}
                <div className="p-3 rounded-lg bg-[#fff1f2] border border-[#ffe4e6] text-[#9f1239] text-[11px] leading-relaxed flex items-start gap-2">
                  <i className="fa-solid fa-thumbtack text-xs mt-0.5"></i>
                  <span>
                    Current gold rate used for estimation: <strong>₹{goldRate22k.toLocaleString()}/g (22K)</strong>. Final cost adjusted upon job completion.
                  </span>
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
                  {activeDocuments.length > 0 && (
                    <button
                      type="button"
                      onClick={() => designFileInputRef.current?.click()}
                      className="text-[10px] font-bold text-[#881337] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <i className="fa-solid fa-plus text-[9px]"></i> Add File
                    </button>
                  )}
                </div>
                <div className="w-full h-px bg-[#ead8ce] mt-2.5 mb-4"></div>

                {activeDocuments.length === 0 ? (
                  <div className="py-4 text-center border border-dashed border-stone-200 rounded-xl bg-stone-50/50 p-3.5">
                    <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-2">
                      <i className="fa-solid fa-folder-open text-xs"></i>
                    </div>
                    <p className="text-xs font-bold text-gray-700">No documents attached yet</p>
                    <p className="text-[10px] text-gray-500 mt-0.5 mb-3">
                      Upload design CAD files or reference images to preview them here.
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => designFileInputRef.current?.click()}
                        className="px-2.5 py-1 text-[10px] font-bold text-[#881337] bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <i className="fa-solid fa-plus text-[9px]"></i> Design File
                      </button>
                      <button
                        type="button"
                        onClick={() => refImageInputRef.current?.click()}
                        className="px-2.5 py-1 text-[10px] font-bold text-[#881337] bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <i className="fa-solid fa-plus text-[9px]"></i> Ref Image
                      </button>
                    </div>
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
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 text-[#881337] flex items-center justify-center text-sm font-bold shadow-2xs">
                  <i className="fa-solid fa-gem"></i>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">
                    {editingRowIndex !== null ? 'Edit Row Details' : 'Add Row Details'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Input all material specifications, diamond clarity, variants, weights, and wastage.
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

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveRowModal} className="space-y-4">

              <div className="border border-stone-200 rounded-xl p-3.5 bg-white">
                <label className="text-[11px] font-bold text-gray-700 block mb-1 uppercase tracking-wide">
                  CUSTOMER NAME
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                  maxLength={255}
                  className="w-full text-xs rounded-lg p-2.5 border border-gray-200 focus:border-[#881337] outline-hidden"
                />
              </div>

              {/* 1. Quick Select Sample Presets matching Image 1 */}
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/90">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">
                    Quick Sample Presets
                  </label>
                  <span className="text-[10px] text-gray-400">Click to fill sample values</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRowForm((prev) => ({
                        ...prev,
                        material_type: '22K Yellow Gold',
                        material_subtitle: '916 Hallmark Standard',
                        from_cts: '22KT',
                        variant: 'Necklace',
                        setting_type: 'Prong',
                        diamond_weight: 'VS1',
                        gold_weight: '22.500',
                        total_weight: '22.500',
                        cons_cts: '-',
                        total_cts: '22.000',
                        cons_wt: '21.340',
                        from_wt: '4.850',
                        to_wt: '2.200',
                        need_pcs: 1,
                        qty: 1,
                        wastage: '0.500',
                        percentages: '2.26%',
                        total_gross_wt: '22.840',
                        total_dia_cts: '0.660',
                        remark: '-',
                        image: '/images/samples/peacock_choker.jpg',
                      }));
                    }}
                    className={`px-3 py-1 text-xs rounded-lg font-semibold border transition-all cursor-pointer ${
                      rowForm.material_type === '22K Yellow Gold'
                        ? 'bg-[#881337] text-white border-[#881337] shadow-2xs'
                        : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-300'
                    }`}
                  >
                    🪙 22K Gold (DG-4587)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRowForm((prev) => ({
                        ...prev,
                        material_type: 'Round Brilliant Diamonds',
                        material_subtitle: 'VS1 Clarity - F Color',
                        from_cts: '18KT',
                        variant: 'Earrings',
                        setting_type: 'Bezel',
                        diamond_weight: 'VVS2',
                        gold_weight: '8.750',
                        total_weight: '8.750',
                        cons_cts: '-',
                        total_cts: '16.500',
                        cons_wt: '17.960',
                        from_wt: '3.970',
                        to_wt: '1.800',
                        need_pcs: 1,
                        qty: 1,
                        wastage: '0.400',
                        percentages: '2.43%',
                        total_gross_wt: '19.210',
                        total_dia_cts: '0.550',
                        remark: '-',
                        image: '/images/samples/emerald_ring.jpg',
                      }));
                    }}
                    className={`px-3 py-1 text-xs rounded-lg font-semibold border transition-all cursor-pointer ${
                      rowForm.material_type === 'Round Brilliant Diamonds'
                        ? 'bg-[#881337] text-white border-[#881337] shadow-2xs'
                        : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-300'
                    }`}
                  >
                    💎 Brilliant Diamonds (DG-4588)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRowForm((prev) => ({
                        ...prev,
                        material_type: '18K Rose Gold',
                        material_subtitle: '750 Hallmark Standard',
                        from_cts: '18KT',
                        variant: 'Ring',
                        setting_type: 'Pave',
                        diamond_weight: 'VS1',
                        gold_weight: '14.200',
                        total_weight: '14.200',
                        cons_cts: '-',
                        total_cts: '14.200',
                        cons_wt: '13.490',
                        from_wt: '3.200',
                        to_wt: '1.500',
                        need_pcs: 1,
                        qty: 1,
                        wastage: '0.350',
                        percentages: '2.46%',
                        total_gross_wt: '14.550',
                        total_dia_cts: '0.450',
                        remark: '-',
                        image: '/images/samples/peacock_bangle.jpg',
                      }));
                    }}
                    className={`px-3 py-1 text-xs rounded-lg font-semibold border transition-all cursor-pointer ${
                      rowForm.material_type === '18K Rose Gold'
                        ? 'bg-[#881337] text-white border-[#881337] shadow-2xs'
                        : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-300'
                    }`}
                  >
                    🪙 18K Rose Gold
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRowForm((prev) => ({
                        ...prev,
                        material_type: 'Platinum 950',
                        material_subtitle: 'Pt 950 Certified',
                        from_cts: '950 Pt',
                        variant: 'Ring',
                        setting_type: 'Prong',
                        diamond_weight: 'VVS1',
                        gold_weight: '16.800',
                        total_weight: '16.800',
                        total_cts: '16.800',
                        cons_wt: '15.960',
                        from_wt: '3.500',
                        to_wt: '1.600',
                        need_pcs: 1,
                        qty: 1,
                        wastage: '0.380',
                        percentages: '2.26%',
                        total_gross_wt: '17.180',
                        total_dia_cts: '0.750',
                        remark: '-',
                      }));
                    }}
                    className="px-3 py-1 text-xs rounded-lg font-semibold border bg-white hover:bg-stone-100 text-stone-700 border-stone-300 transition-all cursor-pointer"
                  >
                    ⚪ Platinum 950
                  </button>
                </div>
              </div>

              {/* 2. SECTION: Material & Design Identification */}
              <div className="border border-stone-200 rounded-xl p-3.5 space-y-3">
                <span className="text-[10px] font-extrabold uppercase text-[#881337] tracking-wider block">
                  1. Material & Design Identification
                </span>

                {/* Work Name / Product Title Input Box */}
                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1 uppercase tracking-wide">
                    WORK NAME / PRODUCT NAME <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={rowForm.work_name || ''}
                    onChange={(e) => updateFormField('work_name', e.target.value)}
                    placeholder="e.g. Peacock Antique Necklace / Kundan Choker / Royal Kada"
                    className={`w-full text-xs rounded-lg p-2.5 font-bold outline-hidden transition-all ${
                      formErrors.work_name
                        ? 'border-2 border-red-500 bg-red-50/20 ring-1 ring-red-400'
                        : 'border border-gray-200 focus:border-[#881337] bg-white text-gray-900'
                    }`}
                  />
                  {formErrors.work_name && (
                    <span className="text-[10px] text-red-600 font-bold block mt-1 flex items-center gap-1">
                      <i className="fa-solid fa-circle-exclamation text-[9px]"></i> {formErrors.work_name}
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1 uppercase tracking-wide">
                      MATERIAL TYPE <span className="text-red-600">*</span>
                    </label>
                    <select
                      value={rowForm.material_type}
                      onChange={(e) => {
                        const val = e.target.value;
                        const isDia = val.toLowerCase().includes('diamond');
                        setRowForm((prev) => ({
                          ...prev,
                          material_type: val,
                          material_subtitle: isDia ? 'VS1 Clarity - F Color' : '916 Hallmark Standard',
                          from_cts: isDia ? '18KT' : '22KT',
                        }));
                        if (formErrors.material_type) {
                          setFormErrors((prev) => {
                            const n = { ...prev };
                            delete n.material_type;
                            return n;
                          });
                        }
                      }}
                      className={`w-full text-xs rounded-lg p-2.5 font-bold outline-hidden transition-all bg-white ${
                        formErrors.material_type
                          ? 'border-2 border-red-500 bg-red-50/20'
                          : 'border border-gray-200 focus:border-[#881337]'
                      }`}
                    >
                      <option value="22K Yellow Gold">22K Yellow Gold</option>
                      <option value="Round Brilliant Diamonds">Round Brilliant Diamonds</option>
                      <option value="18K Yellow Gold">18K Yellow Gold</option>
                      <option value="18K Rose Gold">18K Rose Gold</option>
                      <option value="18K White Gold">18K White Gold</option>
                      <option value="24K Pure Gold">24K Pure Gold</option>
                      <option value="Platinum 950">Platinum 950</option>
                      <option value="Silver 925">Silver 925</option>
                      <option value="Precious Gemstones">Precious Gemstones</option>
                    </select>
                    {formErrors.material_type && (
                      <span className="text-[10px] text-red-600 font-bold block mt-1 flex items-center gap-1">
                        <i className="fa-solid fa-circle-exclamation text-[9px]"></i> {formErrors.material_type}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1 uppercase tracking-wide">
                      MATERIAL SUBTITLE / PURITY
                    </label>
                    <input
                      type="text"
                      value={rowForm.material_subtitle || ''}
                      onChange={(e) => setRowForm({ ...rowForm, material_subtitle: e.target.value })}
                      placeholder="e.g. 916 Hallmark Standard / VS1 Clarity - F Color"
                      className="w-full text-xs border border-gray-200 rounded-lg p-2.5 outline-hidden focus:border-[#881337]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1 uppercase tracking-wide">
                      DESIGN NUMBER <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={rowForm.design_number}
                      onChange={(e) => updateFormField('design_number', e.target.value)}
                      placeholder="e.g. DG-4587"
                      className={`w-full text-xs rounded-lg p-2.5 font-mono font-bold outline-hidden transition-all ${
                        formErrors.design_number
                          ? 'border-2 border-red-500 bg-red-50/20 ring-1 ring-red-400'
                          : 'border border-gray-200 focus:border-[#881337] bg-white'
                      }`}
                    />
                    {formErrors.design_number && (
                      <span className="text-[10px] text-red-600 font-bold block mt-1 flex items-center gap-1">
                        <i className="fa-solid fa-circle-exclamation text-[9px]"></i> {formErrors.design_number}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1 uppercase tracking-wide">
                      VARIANT <span className="text-red-600">*</span>
                    </label>
                    <select
                      value={rowForm.variant}
                      onChange={(e) => updateFormField('variant', e.target.value)}
                      className={`w-full text-xs rounded-lg p-2.5 outline-hidden transition-all bg-white font-medium ${
                        formErrors.variant ? 'border-2 border-red-500 bg-red-50/20' : 'border border-gray-200 focus:border-[#881337]'
                      }`}
                    >
                      <option value="Necklace">Necklace</option>
                      <option value="Earrings">Earrings</option>
                      <option value="Ring">Ring</option>
                      <option value="Bracelet">Bracelet</option>
                      <option value="Bangle">Bangle</option>
                      <option value="Pendant">Pendant</option>
                      <option value="Chain">Chain</option>
                      <option value="Choker">Choker</option>
                      <option value="Kangan">Kangan</option>
                      <option value="Mangalsutra">Mangalsutra</option>
                      <option value="Other">Other</option>
                    </select>
                    {formErrors.variant && (
                      <span className="text-[10px] text-red-600 font-bold block mt-1 flex items-center gap-1">
                        <i className="fa-solid fa-circle-exclamation text-[9px]"></i> {formErrors.variant}
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">
                        SETTING TYPE <span className="text-red-600">*</span>
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
                      value={rowForm.setting_type}
                      onChange={(e) => updateFormField('setting_type', e.target.value)}
                      className={`w-full text-xs rounded-lg p-2.5 outline-hidden transition-all bg-white font-medium ${
                        formErrors.setting_type ? 'border-2 border-red-500 bg-red-50/20' : 'border border-gray-200 focus:border-[#881337]'
                      }`}
                    >
                      {settingStyles.length > 0 ? (
                        settingStyles.map((s) => (
                          <option key={s.id || s.name} value={s.name}>
                            {s.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="Prong">Prong</option>
                          <option value="Bezel">Bezel</option>
                          <option value="Channel">Channel</option>
                          <option value="Pave">Pave</option>
                          <option value="Bar">Bar</option>
                          <option value="Flush">Flush</option>
                          <option value="Tension">Tension</option>
                          <option value="Invisible">Invisible</option>
                          <option value="Plain Casting">Plain Casting</option>
                        </>
                      )}
                    </select>
                    {formErrors.setting_type && (
                      <span className="text-[10px] text-red-600 font-bold block mt-1 flex items-center gap-1">
                        <i className="fa-solid fa-circle-exclamation text-[9px]"></i> {formErrors.setting_type}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. SECTION: Dates, Pieces & Diamond Specifications */}
              <div className="border border-stone-200 rounded-xl p-3.5 space-y-3">
                <span className="text-[10px] font-extrabold uppercase text-[#881337] tracking-wider block">
                  2. Dates, Quantity & Diamond Grade
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1 uppercase tracking-wide">
                      ORDERED DATE <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="date"
                      value={rowForm.ordered_date}
                      onChange={(e) => updateFormField('ordered_date', e.target.value)}
                      className={`w-full text-xs rounded-lg p-2.5 font-mono outline-hidden transition-all ${
                        formErrors.ordered_date ? 'border-2 border-red-500 bg-red-50/20' : 'border border-gray-200 focus:border-[#881337] bg-white'
                      }`}
                    />
                    {formErrors.ordered_date && (
                      <span className="text-[10px] text-red-600 font-bold block mt-1">{formErrors.ordered_date}</span>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1 uppercase tracking-wide">
                      DELIVERY DATE <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="date"
                      value={rowForm.delivery_date}
                      onChange={(e) => updateFormField('delivery_date', e.target.value)}
                      className={`w-full text-xs rounded-lg p-2.5 font-mono outline-hidden transition-all ${
                        formErrors.delivery_date ? 'border-2 border-red-500 bg-red-50/20' : 'border border-gray-200 focus:border-[#881337] bg-white'
                      }`}
                    />
                    {formErrors.delivery_date && (
                      <span className="text-[10px] text-red-600 font-bold block mt-1">{formErrors.delivery_date}</span>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1 uppercase tracking-wide">
                      NEED PCS (QTY) <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={rowForm.need_pcs ?? rowForm.qty ?? 1}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        updateFormField('need_pcs', isNaN(val) ? '' : val);
                        setRowForm((prev) => ({ ...prev, qty: isNaN(val) ? '' : val }));
                      }}
                      className={`w-full text-xs rounded-lg p-2.5 font-mono font-bold outline-hidden transition-all ${
                        formErrors.need_pcs ? 'border-2 border-red-500 bg-red-50/20 ring-1 ring-red-400' : 'border border-gray-200 focus:border-[#881337] bg-white'
                      }`}
                    />
                    {formErrors.need_pcs && (
                      <span className="text-[10px] text-red-600 font-bold block mt-1">{formErrors.need_pcs}</span>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1 uppercase tracking-wide">
                      DIAMOND WEIGHT / GRADE
                    </label>
                    <input
                      type="text"
                      value={rowForm.diamond_weight || ''}
                      onChange={(e) => setRowForm({ ...rowForm, diamond_weight: e.target.value })}
                      placeholder="e.g. VS1 / VVS2 / 0.50ct"
                      className="w-full text-xs border border-gray-200 rounded-lg p-2.5 font-medium outline-hidden focus:border-[#881337]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1 uppercase tracking-wide">
                      FROM CTS (PURITY)
                    </label>
                    <select
                      value={rowForm.from_cts || '22KT'}
                      onChange={(e) => setRowForm({ ...rowForm, from_cts: e.target.value, gold_priory: `${e.target.value} (916)` })}
                      className="w-full text-xs border border-gray-200 rounded-lg p-2.5 font-bold outline-hidden focus:border-[#881337] bg-white"
                    >
                      <option value="22KT">22KT</option>
                      <option value="18KT">18KT</option>
                      <option value="24KT">24KT</option>
                      <option value="14KT">14KT</option>
                      <option value="950 Pt">950 Pt</option>
                      <option value="925 Ag">925 Ag</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1 uppercase tracking-wide">
                      CONS CTS
                    </label>
                    <input
                      type="text"
                      value={rowForm.cons_cts || '-'}
                      onChange={(e) => setRowForm({ ...rowForm, cons_cts: e.target.value })}
                      placeholder="e.g. -"
                      className="w-full text-xs border border-gray-200 rounded-lg p-2.5 font-mono outline-hidden focus:border-[#881337]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1 uppercase tracking-wide">
                      TOTAL CTS
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={rowForm.total_cts || ''}
                      onChange={(e) => setRowForm({ ...rowForm, total_cts: e.target.value })}
                      placeholder="e.g. 22.000"
                      className="w-full text-xs border border-gray-200 rounded-lg p-2.5 font-mono outline-hidden focus:border-[#881337]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1 uppercase tracking-wide">
                      TOTAL DIA CTS
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={rowForm.total_dia_cts || ''}
                      onChange={(e) => setRowForm({ ...rowForm, total_dia_cts: e.target.value })}
                      placeholder="e.g. 0.660"
                      className="w-full text-xs border border-gray-200 rounded-lg p-2.5 font-mono outline-hidden focus:border-[#881337]"
                    />
                  </div>
                </div>
              </div>

              {/* 4. SECTION: Weights Breakdown & Wastage */}
              <div className="border border-stone-200 rounded-xl p-3.5 space-y-3">
                <span className="text-[10px] font-extrabold uppercase text-[#881337] tracking-wider block">
                  3. Weight Breakdown & Wastage (Grams)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1 uppercase tracking-wide">
                      GOLD WEIGHT (G) <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      required
                      value={rowForm.gold_weight ?? rowForm.total_weight ?? ''}
                      onChange={(e) => {
                        const gw = e.target.value;
                        const gwNum = parseFloat(gw) || 0;
                        const wstNum = parseFloat(rowForm.wastage) || 0;
                        setRowForm((prev) => ({
                          ...prev,
                          gold_weight: gw,
                          total_weight: gw,
                          total_gross_wt: gwNum > 0 ? (gwNum + wstNum).toFixed(3) : prev.total_gross_wt,
                          cons_wt: gwNum > 0 ? (gwNum * 0.95).toFixed(3) : prev.cons_wt,
                          total_cts: gwNum > 0 ? gw : prev.total_cts,
                        }));
                        if (formErrors.gold_weight) {
                          setFormErrors((prev) => {
                            const n = { ...prev };
                            delete n.gold_weight;
                            return n;
                          });
                        }
                      }}
                      placeholder="e.g. 22.500"
                      className={`w-full text-xs rounded-lg p-2.5 font-mono font-black outline-hidden transition-all text-gray-900 ${
                        formErrors.gold_weight
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

                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1 uppercase tracking-wide">
                      CONS WT (G)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={rowForm.cons_wt || ''}
                      onChange={(e) => setRowForm({ ...rowForm, cons_wt: e.target.value })}
                      placeholder="e.g. 21.340"
                      className="w-full text-xs border border-gray-200 rounded-lg p-2.5 font-mono outline-hidden focus:border-[#881337]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1 uppercase tracking-wide">
                      FROM WT (G)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={rowForm.from_wt || ''}
                      onChange={(e) => setRowForm({ ...rowForm, from_wt: e.target.value })}
                      placeholder="e.g. 4.850"
                      className="w-full text-xs border border-gray-200 rounded-lg p-2.5 font-mono outline-hidden focus:border-[#881337]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1 uppercase tracking-wide">
                      TO WT (G)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={rowForm.to_wt || ''}
                      onChange={(e) => setRowForm({ ...rowForm, to_wt: e.target.value })}
                      placeholder="e.g. 2.200"
                      className="w-full text-xs border border-gray-200 rounded-lg p-2.5 font-mono outline-hidden focus:border-[#881337]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#b01622] block mb-1 uppercase tracking-wide">
                      WASTAGE (G)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={rowForm.wastage || ''}
                      onChange={(e) => {
                        const wst = e.target.value;
                        const wstNum = parseFloat(wst) || 0;
                        const gwNum = parseFloat(rowForm.gold_weight) || 1;
                        setRowForm((prev) => ({
                          ...prev,
                          wastage: wst,
                          percentages: `${((wstNum / gwNum) * 100).toFixed(2)}%`,
                          total_gross_wt: ((parseFloat(prev.gold_weight) || 0) + wstNum).toFixed(3),
                        }));
                      }}
                      placeholder="e.g. 0.500"
                      className="w-full text-xs border border-rose-200 rounded-lg p-2.5 font-mono font-bold text-[#b01622] outline-hidden focus:border-[#881337] bg-rose-50/30"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1 uppercase tracking-wide">
                      PERCENTAGES (%)
                    </label>
                    <input
                      type="text"
                      value={rowForm.percentages || ''}
                      onChange={(e) => setRowForm({ ...rowForm, percentages: e.target.value })}
                      placeholder="e.g. 2.26%"
                      className="w-full text-xs border border-gray-200 rounded-lg p-2.5 font-mono outline-hidden focus:border-[#881337]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1 uppercase tracking-wide">
                      TOTAL GROSS WT (G)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={rowForm.total_gross_wt || ''}
                      onChange={(e) => setRowForm({ ...rowForm, total_gross_wt: e.target.value })}
                      placeholder="e.g. 22.840"
                      className="w-full text-xs border border-gray-200 rounded-lg p-2.5 font-mono font-bold outline-hidden focus:border-[#881337]"
                    />
                  </div>
                </div>
              </div>

              {/* 5. SECTION: Design File & Reference Image Upload */}
              <div className="border border-stone-200 rounded-xl p-3.5 space-y-3">
                <span className="text-[10px] font-extrabold uppercase text-[#881337] tracking-wider block">
                  4. Design File & Reference Image (Uploads & Samples)
                </span>

                {/* Two side-by-side upload boxes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* BOX 1: Upload Design File */}
                  <div className="flex flex-col">
                    <label className="text-[11px] font-bold text-gray-700 block mb-1 uppercase tracking-wide flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <i className="fa-solid fa-compass-drafting text-[#881337]"></i>
                        Design File (CAD / Blueprint / Drawing)
                      </span>
                      {rowForm.design_file && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRowForm((prev) => ({ ...prev, design_file: '', image: prev.reference_image || '' }));
                          }}
                          className="text-[10px] text-red-600 hover:underline cursor-pointer font-semibold"
                        >
                          Clear
                        </button>
                      )}
                    </label>

                    <div
                      onClick={() => designFileInputRef.current?.click()}
                      className="border-2 border-dashed border-stone-300 hover:border-[#881337] rounded-xl p-3 text-center cursor-pointer transition-colors bg-stone-50/60 hover:bg-rose-50/20 group min-h-[110px] flex flex-col items-center justify-center"
                    >
                      {rowForm.design_file ? (
                        <div className="flex items-center gap-3 w-full text-left">
                          <img
                            src={rowForm.design_file}
                            alt="Design file preview"
                            className="w-14 h-14 object-cover rounded-lg border border-stone-200 shadow-2xs bg-white shrink-0"
                            onError={(e) => {
                              // If CAD/PDF non-image, show document icon
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold text-gray-800 block truncate">
                              {rowForm.design_file_name || 'Design File Attached'}
                            </span>
                            <span className="text-[10px] text-emerald-600 font-semibold block flex items-center gap-1 mt-0.5">
                              <i className="fa-solid fa-circle-check text-[9px]"></i> Ready for job row
                            </span>
                            <span className="text-[10px] text-stone-400 block mt-0.5">Click to change file</span>
                          </div>
                        </div>
                      ) : (
                        <div className="py-1">
                          <div className="w-8 h-8 rounded-full bg-rose-50 text-[#881337] flex items-center justify-center text-xs mx-auto mb-1 group-hover:scale-110 transition-transform">
                            <i className="fa-solid fa-file-arrow-up"></i>
                          </div>
                          <p className="text-xs font-bold text-gray-700">Upload Design File</p>
                          <p className="text-[10px] text-stone-400 mt-0.5">CAD, Blueprint, Sketch, PNG, JPG</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* BOX 2: Upload Reference Image */}
                  <div className="flex flex-col">
                    <label className="text-[11px] font-bold text-gray-700 block mb-1 uppercase tracking-wide flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <i className="fa-solid fa-camera text-[#881337]"></i>
                        Reference Image (Sample / Photo)
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
                      className="border-2 border-dashed border-stone-300 hover:border-[#881337] rounded-xl p-3 text-center cursor-pointer transition-colors bg-stone-50/60 hover:bg-rose-50/20 group min-h-[110px] flex flex-col items-center justify-center"
                    >
                      {rowForm.reference_image ? (
                        <div className="flex items-center gap-3 w-full text-left">
                          <img
                            src={rowForm.reference_image}
                            alt="Reference preview"
                            className="w-14 h-14 object-cover rounded-lg border border-stone-200 shadow-2xs bg-white shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold text-gray-800 block truncate">
                              {rowForm.reference_image_name || 'Reference Photo Attached'}
                            </span>
                            <span className="text-[10px] text-emerald-600 font-semibold block flex items-center gap-1 mt-0.5">
                              <i className="fa-solid fa-circle-check text-[9px]"></i> Ready for job row
                            </span>
                            <span className="text-[10px] text-stone-400 block mt-0.5">Click to change image</span>
                          </div>
                        </div>
                      ) : (
                        <div className="py-1">
                          <div className="w-8 h-8 rounded-full bg-rose-50 text-[#881337] flex items-center justify-center text-xs mx-auto mb-1 group-hover:scale-110 transition-transform">
                            <i className="fa-solid fa-cloud-arrow-up"></i>
                          </div>
                          <p className="text-xs font-bold text-gray-700">Upload Reference Image</p>
                          <p className="text-[10px] text-stone-400 mt-0.5">Sample photo, customer reference</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Preset Samples Selector */}
                <div className="pt-1">
                  <span className="text-[10px] font-bold text-stone-500 block mb-1 uppercase tracking-wide">
                    Or pick from sample jewelry gallery:
                  </span>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {SAMPLE_IMAGES.map((img, i) => (
                      <div
                        key={i}
                        onClick={() =>
                          setRowForm((prev) => ({
                            ...prev,
                            image: img.url,
                            image_name: `${img.label}.jpg`,
                            design_file: prev.design_file || img.url,
                            design_file_name: prev.design_file_name || `${img.label}_Design.jpg`,
                            design_file_type: 'image',
                            reference_image: img.url,
                            reference_image_name: `${img.label}_Ref.jpg`,
                            reference_image_type: 'image',
                          }))
                        }
                        className={`rounded-lg border overflow-hidden cursor-pointer p-1 transition-all flex flex-col items-center justify-center ${
                          rowForm.reference_image === img.url || rowForm.design_file === img.url
                            ? 'border-[#881337] ring-2 ring-[#881337]/30 bg-rose-50'
                            : 'border-stone-200 hover:border-stone-400 bg-white'
                        }`}
                        title={img.label}
                      >
                        <img
                          src={img.url}
                          alt={img.label}
                          className="w-full h-11 object-cover rounded bg-stone-100"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/images/samples/peacock_choker.jpg';
                          }}
                        />
                        <span className="text-[9px] text-stone-600 font-medium truncate w-full text-center mt-0.5 block">
                          {img.label.split(' ')[0]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 6. SECTION: REMARK / NOTES */}
              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1 uppercase tracking-wide">
                  REMARK / ARTISAN NOTES
                </label>
                <input
                  type="text"
                  value={rowForm.remark || '-'}
                  onChange={(e) => setRowForm({ ...rowForm, remark: e.target.value })}
                  placeholder="e.g. -"
                  className="w-full text-xs border border-gray-200 rounded-lg p-2.5 outline-hidden focus:border-[#881337]"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 sticky bottom-0 bg-white z-10">
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
                  onClick={() => setPreviewDoc(null)}
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

    </div>
  );
}
