import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Pagination from '../../components/Pagination';
import { handleIntegerKeyDown, handleDecimalKeyDown, sanitizeInteger, sanitizeDecimal, normalizeNumericInput, handleNumericFocus } from '../../utils/numberInputUtils';

export default function PurchaseEntry({ initialTab }) {
  const { showToast, showConfirm } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const isDetailsRoute = location.pathname === '/purchase/details';
  const isStockRoute = location.pathname === '/purchase/stock' || new URLSearchParams(location.search).get('tab') === 'stock' || location.hash === '#diamond-stock-section';
  const [activeTab, setActiveTab] = useState(
    initialTab || (isStockRoute ? 'stock' : (isDetailsRoute ? 'details' : 'new'))
  );

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    const isDiamondSection = location.hash === '#diamond-stock-section' || params.get('section') === 'diamond';

    if (tabParam === 'stock' || location.pathname === '/purchase/stock' || isDiamondSection) {
      setActiveTab('stock');
      fetchUnifiedStock();
    } else if (tabParam === 'opening') {
      setActiveTab('opening');
    } else if (location.pathname === '/purchase/details' || tabParam === 'details') {
      setActiveTab('details');
    } else if (location.pathname === '/purchase/new' || (location.pathname === '/purchase/entry' && !tabParam && !isDiamondSection)) {
      setActiveTab('new');
    }

    if (isDiamondSection) {
      setTimeout(() => {
        const el = document.getElementById('diamond-stock-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 350);
    }
  }, [location.pathname, location.search, location.hash]);

  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
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
    raw_material_id: '',
    count_qty: '',
    unit: 'g',
    category_id: '',
    item_name: '',
    product_code: '',
    metal_type: 'gold',
    purity: '',
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

  // Dedicated Opening Stock State
  const initialOpeningState = {
    stock_number: '',
    material_type: 'gold', // 'gold' | 'diamond' | 'stone' | 'silver'
    stamp: '',
    karat: '22K',
    purity: '91.6',
    unit: 'g',
    weight: '',
    carat_weight: '',
    quantity: '',
    rate: '',
    total_value: '',
    entry_date: new Date().toISOString().split('T')[0],
    notes: 'Initial business vault opening balance',
  };
  const [openingForm, setOpeningForm] = useState(initialOpeningState);
  const [openingSaving, setOpeningSaving] = useState(false);
  const [generatingOpeningNo, setGeneratingOpeningNo] = useState(false);
  const [openingStockEntries, setOpeningStockEntries] = useState([]);
  const [openingCurrentPage, setOpeningCurrentPage] = useState(1);
  const [openingItemsPerPage, setOpeningItemsPerPage] = useState(10);
  const [unifiedStockData, setUnifiedStockData] = useState(null);
  const [unifiedLoading, setUnifiedLoading] = useState(false);
  const [diamondFilterStamp, setDiamondFilterStamp] = useState('');
  const [diamondCurrentPage, setDiamondCurrentPage] = useState(1);
  const [diamondItemsPerPage, setDiamondItemsPerPage] = useState(5);
  const [goldFilterKarat, setGoldFilterKarat] = useState('');

  // Edit Stock Balance Modal state
  const [editStockModal, setEditStockModal] = useState({
    isOpen: false,
    row: null,
    materialType: '',
    stampGrade: '',
    unit: '',
    availableWeight: '',
    availableCaratWeight: '',
    availableQuantity: '',
    karat: '',
    stamp: '',
    notes: '',
    saving: false,
  });

  // Active Masters from backend
  const [stampsList, setStampsList] = useState([]);
  const [karatsList, setKaratsList] = useState([]);
  const [unitsList, setUnitsList] = useState([]);
  const [claritiesList, setClaritiesList] = useState([]);
  const [colorsList, setColorsList] = useState([]);

  // Fetch initial data (Suppliers, Products, Categories, Masters, Opening Stocks, Unified Ledger)
  const fetchData = async () => {
    try {
      setLoading(true);
      const [
        supRes, prodRes, catRes, rawMatRes, entryRes,
        stampRes, karatRes, unitRes, clarityRes, colorRes,
        opRes, uniRes
      ] = await Promise.all([
        api.get('/suppliers'),
        api.get('/products'),
        api.get('/categories').catch(() => ({ data: [] })),
        api.get('/raw-materials').catch(() => ({ data: [] })),
        api.get('/purchase-entries'),
        api.get('/stamps').catch(() => ({ data: [] })),
        api.get('/karats').catch(() => ({ data: [] })),
        api.get('/units').catch(() => ({ data: [] })),
        api.get('/diamond-clarities').catch(() => ({ data: [] })),
        api.get('/diamond-colors').catch(() => ({ data: [] })),
        api.get('/material-opening-stocks').catch(() => ({ data: { data: [] } })),
        api.get('/raw-materials/unified-stock').catch(() => ({ data: null })),
      ]);

      const rawSuppliers = Array.isArray(supRes.data?.data) ? supRes.data.data : (Array.isArray(supRes.data) ? supRes.data : []);
      const activeSuppliers = rawSuppliers.filter(s => !s.status || s.status === 'active');

      const rawProducts = Array.isArray(prodRes.data?.data) ? prodRes.data.data : (Array.isArray(prodRes.data) ? prodRes.data : []);
      const activeProducts = rawProducts.filter(p => !p.status || p.status === 'active');

      const rawCategories = Array.isArray(catRes.data?.data) ? catRes.data.data : (Array.isArray(catRes.data) ? catRes.data : []);
      const rawMats = Array.isArray(rawMatRes.data) ? rawMatRes.data : (rawMatRes.data?.data || []);
      const rawEntries = Array.isArray(entryRes.data?.data) ? entryRes.data.data : (Array.isArray(entryRes.data) ? entryRes.data : []);

      setSuppliers(activeSuppliers);
      setProducts(activeProducts);
      setCategories(rawCategories);
      setRawMaterials(rawMats);
      setPurchaseEntries(rawEntries);

      // Masters
      setStampsList(Array.isArray(stampRes.data) ? stampRes.data : (stampRes.data?.data || []));
      setKaratsList(Array.isArray(karatRes.data) ? karatRes.data : (karatRes.data?.data || []));
      setUnitsList(Array.isArray(unitRes.data) ? unitRes.data : (unitRes.data?.data || []));
      setClaritiesList(Array.isArray(clarityRes.data) ? clarityRes.data : (clarityRes.data?.data || []));
      setColorsList(Array.isArray(colorRes.data) ? colorRes.data : (colorRes.data?.data || []));

      // Opening stocks & unified ledger
      setOpeningStockEntries(Array.isArray(opRes.data?.data) ? opRes.data.data : (Array.isArray(opRes.data) ? opRes.data : []));
      if (uniRes.data?.status === 'success') {
        setUnifiedStockData(uniRes.data);
      }

      // Auto-prefill if redirected from Low Stock Alerts / Restock buttons
      if (location.state) {
        if (location.state.purchase_type === 'raw_material') {
          const matType = (location.state.metal_type || 'gold').toLowerCase();
          const targetRm = rawMats.find(rm => 
            (location.state.raw_material_id && (String(rm.id) === String(location.state.raw_material_id) || String(rm.id) === String(location.state.raw_material_id).replace('raw_', ''))) ||
            (rm.material_type?.toLowerCase() === matType)
          );
          setFormData(prev => ({
            ...prev,
            purchase_type: 'raw_material',
            metal_type: matType,
            raw_material_id: targetRm ? targetRm.id : prev.raw_material_id,
            item_name: targetRm ? targetRm.name : (location.state.raw_material_name || ''),
            unit: targetRm?.unit || (matType === 'diamond' ? 'ct' : (matType === 'stone' ? 'units' : 'g')),
          }));
        } else if (location.state.productId) {
          const targetProd = activeProducts.find(p => String(p.id) === String(location.state.productId));
          setFormData(prev => ({
            ...prev,
            purchase_type: 'finished_product',
            product_id: location.state.productId,
            item_name: targetProd ? targetProd.name : (location.state.productName || ''),
            category_id: targetProd ? targetProd.category_id : prev.category_id,
          }));
        }
      }

      // Auto-fetch fresh Purchase Ref Number & Opening Stock Ref Number
      fetchPurchaseNo();
      fetchOpeningNo();

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

  const fetchOpeningNo = async () => {
    try {
      setGeneratingOpeningNo(true);
      const res = await api.get('/material-opening-stocks/generate-no');
      if (res.data && res.data.stock_number) {
        setOpeningForm(prev => ({ ...prev, stock_number: res.data.stock_number }));
      }
    } catch (err) {
      console.error('Error generating opening stock no:', err);
    } finally {
      setGeneratingOpeningNo(false);
    }
  };

  const fetchOpeningStockEntries = async () => {
    try {
      const res = await api.get('/material-opening-stocks');
      if (res.data?.data) {
        setOpeningStockEntries(res.data.data);
      }
    } catch (e) {
      console.error('Failed to fetch opening stock entries:', e);
    }
  };

  const fetchUnifiedStock = async () => {
    try {
      setUnifiedLoading(true);
      const res = await api.get('/raw-materials/unified-stock');
      if (res.data?.status === 'success') {
        setUnifiedStockData(res.data);
      }
    } catch (e) {
      console.error('Failed to fetch unified stock:', e);
    } finally {
      setUnifiedLoading(false);
    }
  };

  const handleOpenEditStockModal = (row) => {
    const isDia = row.material_type?.toLowerCase() === 'diamond';
    const isStone = row.material_type?.toLowerCase().includes('stone');

    setEditStockModal({
      isOpen: true,
      row,
      materialType: row.material_type,
      stampGrade: row.stamp_grade || '',
      unit: row.unit || (isDia ? 'ct' : 'g'),
      availableWeight: row.available_weight !== null ? String(row.available_weight) : '',
      availableCaratWeight: row.available_carat_weight !== null ? String(row.available_carat_weight) : '',
      availableQuantity: row.available_quantity !== null ? String(row.available_quantity) : '',
      karat: (row.karat && !row.karat.includes('/') && row.karat !== '—') ? row.karat : '',
      stamp: isDia ? 'all' : (row.stamp || ''),
      notes: '',
      saving: false,
    });
  };

  const handleCloseEditStockModal = () => {
    setEditStockModal(prev => ({ ...prev, isOpen: false, saving: false }));
  };

  const handleSaveEditStock = async (e) => {
    e.preventDefault();
    try {
      setEditStockModal(prev => ({ ...prev, saving: true }));
      const payload = {
        material_type: editStockModal.materialType,
        available_weight: editStockModal.availableWeight !== '' ? parseFloat(editStockModal.availableWeight) : null,
        available_carat_weight: editStockModal.availableCaratWeight !== '' ? parseFloat(editStockModal.availableCaratWeight) : null,
        available_quantity: editStockModal.availableQuantity !== '' ? parseFloat(editStockModal.availableQuantity) : null,
        karat: editStockModal.karat || null,
        stamp: editStockModal.stamp || null,
        notes: editStockModal.notes || `Stock adjusted from Unified Available Stock table`,
      };

      const res = await api.post('/raw-materials/unified-stock/update', payload);
      if (res.data?.status === 'success') {
        showToast(res.data.message || 'Stock updated successfully!', 'success');
        handleCloseEditStockModal();
        await fetchUnifiedStock();
        await fetchData();
      } else {
        showToast(res.data?.message || 'Failed to update stock', 'error');
      }
    } catch (err) {
      console.error('Failed to update stock:', err);
      showToast(err.response?.data?.message || 'Failed to update stock balance', 'error');
    } finally {
      setEditStockModal(prev => ({ ...prev, saving: false }));
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Selected product details for live display card
  const selectedProduct = products.find(p => String(p.id) === String(formData.product_id));
  const selectedSupplier = suppliers.find(s => String(s.id) === String(formData.supplier_id));
  const selectedRawMaterial = rawMaterials.find(rm => String(rm.id) === String(formData.raw_material_id))
    || rawMaterials.find(rm => rm.material_type?.toLowerCase() === formData.metal_type?.toLowerCase());

  const handleRawMaterialChange = (e) => {
    const rawId = e.target.value;
    const rm = rawMaterials.find(r => String(r.id) === String(rawId));
    if (rm) {
      setFormData(prev => ({
        ...prev,
        raw_material_id: rm.id,
        metal_type: rm.material_type || prev.metal_type,
        unit: rm.unit || prev.unit || 'g',
        purity: rm.purity || prev.purity || '',
        item_name: rm.name || prev.item_name,
      }));
    } else {
      setFormData(prev => ({ ...prev, raw_material_id: '' }));
    }
  };

  const selectedCategoryCode = selectedProduct?.category?.code?.toUpperCase() || '';
  const selectedCategoryName = selectedProduct?.category?.name?.toLowerCase() || '';
  const isDiamondProduct = formData.metal_type === 'diamond' || selectedCategoryCode === 'DIAMOND' || selectedCategoryName.includes('diamond');

  // Dynamic Weight Math
  const grossWtVal = parseFloat(formData.weight) || 0;
  const countQtyVal = parseFloat(formData.count_qty) || 0;
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
    if (name === 'metal_type') {
      const isDia = value === 'diamond';
      const isSil = value === 'silver';
      let defPurity = '24K (999)';
      let defUnit = 'g';
      if (isDia) {
        const diaStamps = stampsList.filter(s => !s.applicable_for || s.applicable_for.toLowerCase() === 'diamond');
        defPurity = diaStamps.length > 0 ? diaStamps[0].name : 'IGI';
        defUnit = 'ct';
      } else if (isSil) {
        defPurity = '925 Silver';
      }
      setFormData(prev => ({
        ...prev,
        metal_type: value,
        purity: defPurity,
        unit: defUnit,
      }));
      return;
    }
    const numericFields = ['qty', 'weight', 'count_qty', 'less_weight', 'net_weight', 'touch', 'rate', 'making_charge', 'stone_weight', 'stone_cost', 'total_amount'];
    const sanitizedVal = numericFields.includes(name)
      ? normalizeNumericInput(value, formData[name])
      : value;
    setFormData(prev => ({ ...prev, [name]: sanitizedVal }));
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
    if (formData.purchase_type === 'raw_material') {
      if (!formData.raw_material_id && !formData.metal_type) {
        showToast('Please select a Raw Material Master', 'error', 'Validation Error');
        return;
      }
    }
    if (!formData.weight || parseFloat(formData.weight) <= 0) {
      showToast('Gross Weight is required and must be greater than 0', 'error', 'Validation Error');
      return;
    }

    setSaving(true);
    try {
      let payload;
      const isNewProduct = formData.purchase_type === 'finished_product' && jewelMode === 'new_item';

      const sanitizedStoneWeight = parseFloat(formData.stone_weight) || 0;
      const sanitizedLessWeight = parseFloat(formData.less_weight) || 0;
      const sanitizedMakingCharge = parseFloat(formData.making_charge) || 0;
      const sanitizedStoneCost = parseFloat(formData.stone_cost) || 0;

      if (imageFile) {
        payload = new FormData();
        Object.keys(formData).forEach(key => {
          if (formData[key] !== null && formData[key] !== undefined) {
            payload.append(key, formData[key]);
          }
        });
        payload.append('is_new_product', isNewProduct ? '1' : '0');
        payload.append('raw_material_id', formData.raw_material_id || '');
        payload.append('count_qty', formData.count_qty || '0');
        payload.append('unit', formData.unit || 'g');
        payload.append('image', imageFile);
        payload.append('stone_weight', String(sanitizedStoneWeight));
        payload.append('less_weight', String(sanitizedLessWeight));
        payload.append('making_charge', String(sanitizedMakingCharge));
        payload.append('stone_cost', String(sanitizedStoneCost));
        payload.append('net_weight', computedNetWt);
        payload.append('fine_weight', computedFineWt);
        payload.append('total_amount', formData.total_amount || computedTotal);
      } else {
        payload = {
          ...formData,
          is_new_product: isNewProduct,
          raw_material_id: formData.raw_material_id || null,
          count_qty: parseFloat(formData.count_qty) || 0,
          unit: formData.unit || 'g',
          stone_weight: sanitizedStoneWeight,
          less_weight: sanitizedLessWeight,
          making_charge: sanitizedMakingCharge,
          stone_cost: sanitizedStoneCost,
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

  const handleOpeningInputChange = (e) => {
    const { name, value } = e.target;
    setOpeningForm(prev => {
      const updated = { ...prev, [name]: value };
      const r = parseFloat(name === 'rate' ? value : updated.rate) || 0;
      const wt = parseFloat(name === 'weight' ? value : updated.weight) || 0;
      const cwt = parseFloat(name === 'carat_weight' ? value : updated.carat_weight) || 0;
      const qty = parseFloat(name === 'quantity' ? value : updated.quantity) || 0;

      if (updated.material_type === 'diamond') {
        updated.total_value = (cwt > 0 ? (cwt * r) : (qty * r)).toFixed(2);
      } else if (updated.material_type === 'stone') {
        updated.total_value = (cwt > 0 ? (cwt * r) : (wt > 0 ? wt * r : qty * r)).toFixed(2);
      } else {
        updated.total_value = (wt * r).toFixed(2);
      }
      return updated;
    });
  };

  const handleOpeningMaterialChange = (matType) => {
    const defaultUnit = (matType === 'diamond' || matType === 'stone') ? 'ct' : 'g';
    const defaultKarat = matType === 'gold' ? '22K' : (matType === 'platinum' ? '950 Pt' : '');
    const defaultPurity = matType === 'gold' ? '91.6' : (matType === 'silver' ? '92.5' : (matType === 'platinum' ? '95.0' : ''));

    const matStamps = stampsList.filter(s => {
      if (!s.applicable_for) return true;
      const af = s.applicable_for.toLowerCase();
      return af.includes(matType) || af.includes('all');
    });

    setOpeningForm(prev => ({
      ...prev,
      material_type: matType,
      unit: defaultUnit,
      karat: defaultKarat,
      purity: defaultPurity,
      stamp: matStamps.length > 0 ? matStamps[0].name : '',
      weight: '',
      carat_weight: '',
      quantity: '',
      rate: '',
      total_value: '',
    }));
  };

  const handleOpeningSubmit = async (e) => {
    e.preventDefault();
    const mat = openingForm.material_type;
    if (mat === 'gold' || mat === 'silver' || mat === 'platinum') {
      if (!openingForm.weight || parseFloat(openingForm.weight) <= 0) {
        showToast('Weight is required and must be greater than 0', 'error', 'Validation Error');
        return;
      }
    } else if (mat === 'diamond') {
      if ((!openingForm.carat_weight || parseFloat(openingForm.carat_weight) <= 0) &&
          (!openingForm.quantity || parseFloat(openingForm.quantity) <= 0)) {
        showToast('Either Carat Weight or Quantity is required for diamond stock', 'error', 'Validation Error');
        return;
      }
    } else if (mat === 'stone') {
      if ((!openingForm.carat_weight || parseFloat(openingForm.carat_weight) <= 0) &&
          (!openingForm.weight || parseFloat(openingForm.weight) <= 0) &&
          (!openingForm.quantity || parseFloat(openingForm.quantity) <= 0)) {
        showToast('Carat Weight, Weight or Quantity is required for colour stone stock', 'error', 'Validation Error');
        return;
      }
    }

    setOpeningSaving(true);
    try {
      const payload = {
        ...openingForm,
        weight: openingForm.weight ? parseFloat(openingForm.weight) : 0,
        carat_weight: openingForm.carat_weight ? parseFloat(openingForm.carat_weight) : 0,
        quantity: openingForm.quantity ? parseFloat(openingForm.quantity) : 0,
        rate: openingForm.rate ? parseFloat(openingForm.rate) : 0,
        total_value: openingForm.total_value ? parseFloat(openingForm.total_value) : 0,
        purity: openingForm.purity ? parseFloat(openingForm.purity) : null,
      };

      const res = await api.post('/material-opening-stocks', payload);
      showToast(res.data?.message || 'Opening stock recorded and inventory balance updated successfully!', 'success');

      window.dispatchEvent(new CustomEvent('rudhra_inventory_updated'));
      window.dispatchEvent(new CustomEvent('rudhra_purchase_updated'));

      fetchUnifiedStock();
      fetchOpeningStockEntries();
      fetchOpeningNo();
      setOpeningCurrentPage(1);

      setOpeningForm(prev => ({
        ...prev,
        weight: '',
        carat_weight: '',
        quantity: '',
        rate: '',
        total_value: '',
      }));

    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to save opening stock';
      showToast(msg, 'error');
    } finally {
      setOpeningSaving(false);
    }
  };

  const handleDeleteOpeningStock = async (id, stockNo) => {
    const confirmed = await showConfirm({
      title: 'Reverse Opening Stock',
      message: `Are you sure you want to reverse opening stock "${stockNo}"? Vault balance will be automatically adjusted.`,
      icon: 'fa-solid fa-trash-can',
      confirmText: 'Reverse Stock'
    });
    if (!confirmed) return;

    try {
      const res = await api.delete(`/material-opening-stocks/${id}`);
      showToast(res.data?.message || 'Opening stock reversed successfully', 'success');

      window.dispatchEvent(new CustomEvent('rudhra_inventory_updated'));
      window.dispatchEvent(new CustomEvent('rudhra_purchase_updated'));
      fetchUnifiedStock();
      fetchOpeningStockEntries();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to reverse opening stock', 'error');
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
            onClick={() => { fetchData(); fetchUnifiedStock(); }}
            className="p-2.5 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <i className={`fa-solid fa-rotate ${loading || unifiedLoading ? 'animate-spin' : ''}`}></i>
          </button>
        </div>
      </div>

      {/* NAVIGATION SUB-TABS (Supplier Purchase | Opening Stock | Unified Stock | History) */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => { setActiveTab('new'); navigate('/purchase/new'); }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'new'
              ? 'bg-[#b01622] text-white shadow-sm ring-2 ring-red-200'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <i className="fa-solid fa-cart-shopping"></i>
          New Supplier Purchase
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('opening'); }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'opening'
              ? 'bg-[#b01622] text-white shadow-sm ring-2 ring-red-200'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <i className="fa-solid fa-vault"></i>
          Existing Material / Opening Stock
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('stock'); fetchUnifiedStock(); }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'stock'
              ? 'bg-[#b01622] text-white shadow-sm ring-2 ring-red-200'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <i className="fa-solid fa-scale-balanced"></i>
          Unified Available Stock View
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('details'); navigate('/purchase/details'); }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'details'
              ? 'bg-[#b01622] text-white shadow-sm ring-2 ring-red-200'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <i className="fa-solid fa-clock-rotate-left"></i>
          Purchase History Log
        </button>
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
                {/* 1. Existing Raw Material Master Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-gray-800">
                      Select Raw Material Master <span className="text-red-500">*</span>
                    </label>
                    <Link
                      to="/masters/raw-materials"
                      className="text-[11px] font-bold text-[#b01622] hover:underline flex items-center gap-1"
                    >
                      <i className="fa-solid fa-plus text-[10px]"></i> Add Material
                    </Link>
                  </div>
                  <select
                    name="raw_material_id"
                    value={formData.raw_material_id}
                    onChange={handleRawMaterialChange}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-[#b01622]"
                  >
                    <option value="">-- Select Existing Raw Material --</option>
                    {rawMaterials.map((rm) => (
                      <option key={rm.id} value={rm.id}>
                        {rm.name} ({rm.material_type?.toUpperCase()}) — Current: {parseFloat(rm.current_balance || 0).toFixed(3)} {rm.unit || 'g'}{parseFloat(rm.current_count || 0) > 0 ? ` | Count: ${parseFloat(rm.current_count)}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1.5">
                      Purity
                    </label>
                    <input
                      type="text"
                      name="purity"
                      value={formData.purity}
                      onChange={handleInputChange}
                      placeholder="e.g. 916, 999, 22K, 925, VVS1"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#b01622]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1.5">
                      Unit of Measurement
                    </label>
                    <select
                      name="unit"
                      value={formData.unit || selectedRawMaterial?.unit || 'g'}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-[#b01622]"
                    >
                      <option value="g">Grams (g)</option>
                      <option value="kg">Kilograms (kg)</option>
                      <option value="ct">Carats (ct)</option>
                      <option value="pcs">Pieces (pcs)</option>
                      <option value="units">Units / Pieces</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5">
                    Purchased Count / Pieces
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    name="count_qty"
                    value={formData.count_qty}
                    onChange={(e) => setFormData({ ...formData, count_qty: sanitizeDecimal(e.target.value) })}
                    placeholder="e.g. 5 (pieces/units)"
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#b01622]"
                  />
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

                {/* Live Stock Balance Verification Card */}
                {selectedRawMaterial && (
                  <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-900 border-b border-amber-200/60 pb-1.5">
                      <span className="flex items-center gap-1.5">
                        <i className="fa-solid fa-scale-balanced text-amber-700"></i>
                        Live Stock Impact: {selectedRawMaterial.name}
                      </span>
                      <span className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-amber-200 text-amber-800">
                        Unit: {formData.unit || selectedRawMaterial.unit}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5 text-center pt-0.5">
                      <div className="bg-white p-2 rounded-lg border border-amber-100 shadow-2xs">
                        <div className="text-[10px] font-bold text-gray-500 uppercase">Current Stock</div>
                        <div className="text-xs font-bold text-gray-800 font-mono mt-0.5">
                          {parseFloat(selectedRawMaterial.current_balance || 0).toFixed(3)} {formData.unit || selectedRawMaterial.unit}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5">
                          Count: <strong className="text-gray-700">{parseFloat(selectedRawMaterial.current_count || 0)}</strong>
                        </div>
                      </div>

                      <div className="bg-white p-2 rounded-lg border border-amber-200 shadow-2xs">
                        <div className="text-[10px] font-bold text-amber-800 uppercase">+ Added Stock</div>
                        <div className="text-xs font-bold text-[#b01622] font-mono mt-0.5">
                          +{grossWtVal.toFixed(3)} {formData.unit || selectedRawMaterial.unit}
                        </div>
                        <div className="text-[10px] text-amber-700 mt-0.5">
                          Count: <strong>+{countQtyVal}</strong>
                        </div>
                      </div>

                      <div className="bg-emerald-50/80 p-2 rounded-lg border border-emerald-200 shadow-2xs">
                        <div className="text-[10px] font-bold text-emerald-800 uppercase">= Resulting Stock</div>
                        <div className="text-xs font-bold text-emerald-700 font-mono mt-0.5">
                          {(parseFloat(selectedRawMaterial.current_balance || 0) + grossWtVal).toFixed(3)} {formData.unit || selectedRawMaterial.unit}
                        </div>
                        <div className="text-[10px] text-emerald-800 mt-0.5">
                          Count: <strong>{parseFloat(selectedRawMaterial.current_count || 0) + countQtyVal}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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

              {/* Upload Item Image File Only */}
              <div className="flex-1 w-full space-y-1">
                <label className="inline-flex px-4 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-[#b01622] text-xs font-bold rounded-xl cursor-pointer transition-all items-center gap-2 shadow-2xs">
                  <i className="fa-solid fa-cloud-arrow-up"></i>
                  <span>Upload Item Image File</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageFileChange}
                  />
                </label>
                <p className="text-[11px] text-gray-400">
                  Select an image from your device (PNG, JPG, JPEG, WEBP up to 5MB).
                </p>
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
                  onFocus={handleNumericFocus}
                  name="qty"
                  value={formData.qty}
                  onChange={(e) => setFormData(prev => ({ ...prev, qty: sanitizeInteger(e.target.value, false, null, null, prev.qty) }))}
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
                  onFocus={handleNumericFocus}
                  name="weight"
                  value={formData.weight}
                  onChange={(e) => setFormData(prev => ({ ...prev, weight: sanitizeDecimal(e.target.value, false, 3, null, null, prev.weight) }))}
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
                  onFocus={handleNumericFocus}
                  name="less_weight"
                  value={formData.less_weight}
                  onChange={(e) => setFormData(prev => ({ ...prev, less_weight: sanitizeDecimal(e.target.value, false, 3, null, null, prev.less_weight) }))}
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
                  onFocus={handleNumericFocus}
                  name="touch"
                  value={formData.touch}
                  onChange={(e) => setFormData(prev => ({ ...prev, touch: sanitizeDecimal(e.target.value, false, 3, null, null, prev.touch) }))}
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
                  onFocus={handleNumericFocus}
                  name="rate"
                  value={formData.rate}
                  onChange={(e) => setFormData(prev => ({ ...prev, rate: sanitizeDecimal(e.target.value, false, 2, null, null, prev.rate) }))}
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
                  onFocus={handleNumericFocus}
                  name="making_charge"
                  value={formData.making_charge}
                  onChange={(e) => setFormData(prev => ({ ...prev, making_charge: sanitizeDecimal(e.target.value, false, 2, null, null, prev.making_charge) }))}
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
                  onFocus={handleNumericFocus}
                  name="stone_cost"
                  value={formData.stone_cost}
                  onChange={(e) => setFormData(prev => ({ ...prev, stone_cost: sanitizeDecimal(e.target.value, false, 2, null, null, prev.stone_cost) }))}
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
                  onFocus={handleNumericFocus}
                  name="total_amount"
                  value={formData.total_amount || computedTotal}
                  onChange={(e) => setFormData(prev => ({ ...prev, total_amount: sanitizeDecimal(e.target.value, false, 2, null, null, prev.total_amount) }))}
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

      {/* DEDICATED OPENING STOCK / EXISTING MATERIAL ENTRY FORM */}
      {activeTab === 'opening' && (
        <div className="space-y-6">
          <form onSubmit={handleOpeningSubmit} className="bg-white rounded-2xl border border-gray-200/90 shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5 text-base font-bold text-gray-900">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center text-sm">
                  <i className="fa-solid fa-vault"></i>
                </div>
                <div>
                  <span>Record Jewellery Material Opening Stock / Existing Stock</span>
                  <p className="text-xs text-gray-500 font-normal mt-0.5">
                    Record materials already owned by Rudhra Jewellers to establish starting stock balances without creating supplier debt.
                  </p>
                </div>
              </div>
              <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full font-semibold">
                <i className="fa-solid fa-shield-check text-emerald-600 mr-1.5"></i> Vault Balance Initializer
              </span>
            </div>

            {/* A. MATERIAL TYPE SELECTION */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                <i className="fa-solid fa-gem text-[#b01622]"></i>
                Select Material Type:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => handleOpeningMaterialChange('gold')}
                  className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    openingForm.material_type === 'gold'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-sm ring-2 ring-amber-200'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <i className="fa-solid fa-coins"></i>
                  Gold
                </button>
                <button
                  type="button"
                  onClick={() => handleOpeningMaterialChange('diamond')}
                  className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    openingForm.material_type === 'diamond'
                      ? 'bg-cyan-600 text-white border-cyan-600 shadow-sm ring-2 ring-cyan-200'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <i className="fa-solid fa-gem"></i>
                  Diamond
                </button>
                <button
                  type="button"
                  onClick={() => handleOpeningMaterialChange('platinum')}
                  className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    openingForm.material_type === 'platinum'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-200'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <i className="fa-solid fa-crown"></i>
                  Platinum
                </button>
                <button
                  type="button"
                  onClick={() => handleOpeningMaterialChange('stone')}
                  className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    openingForm.material_type === 'stone'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm ring-2 ring-purple-200'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <i className="fa-solid fa-shapes"></i>
                  Colour Stones
                </button>
                <button
                  type="button"
                  onClick={() => handleOpeningMaterialChange('silver')}
                  className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    openingForm.material_type === 'silver'
                      ? 'bg-slate-700 text-white border-slate-700 shadow-sm ring-2 ring-slate-200'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <i className="fa-solid fa-ring"></i>
                  Silver
                </button>
              </div>
            </div>

            {/* B. DYNAMIC FORM FIELDS BY MATERIAL TYPE */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                <i className="fa-solid fa-sliders text-[#b01622]"></i>
                {openingForm.material_type.toUpperCase()} Specifications & Starting Stock
              </h3>

              {/* 1. GOLD FIELDS */}
              {openingForm.material_type === 'gold' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Weight (g) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      name="weight"
                      value={openingForm.weight}
                      onKeyDown={handleDecimalKeyDown}
                      onChange={(e) => handleOpeningInputChange({ target: { name: 'weight', value: sanitizeDecimal(e.target.value) } })}
                      placeholder="e.g. 50.000"
                      required
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Stamp / Purity Master
                    </label>
                    <select
                      name="stamp"
                      value={openingForm.stamp}
                      onChange={handleOpeningInputChange}
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    >
                      <option value="">-- Select Gold Stamp --</option>
                      {stampsList
                        .filter(s => !s.applicable_for || s.applicable_for.toLowerCase().includes('gold') || s.applicable_for.toLowerCase().includes('all'))
                        .map(s => (
                          <option key={s.id} value={s.name}>{s.name} ({s.code || s.applicable_for || 'Stamp'})</option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Karat
                    </label>
                    <select
                      name="karat"
                      value={openingForm.karat}
                      onChange={handleOpeningInputChange}
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    >
                      <option value="">-- Select Karat --</option>
                      {karatsList.map(k => (
                        <option key={k.id} value={k.name}>{k.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Unit
                    </label>
                    <select
                      name="unit"
                      value={openingForm.unit}
                      onChange={handleOpeningInputChange}
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    >
                      {unitsList.length > 0 ? (
                        unitsList.map(u => (
                          <option key={u.id} value={u.code || u.name}>{u.name} ({u.code})</option>
                        ))
                      ) : (
                        <option value="g">Grams (g)</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Purity / Touch (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      name="purity"
                      value={openingForm.purity}
                      onChange={handleOpeningInputChange}
                      placeholder="e.g. 91.6"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Rate per Gram (₹) <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="rate"
                      value={openingForm.rate}
                      onKeyDown={handleDecimalKeyDown}
                      onChange={(e) => handleOpeningInputChange({ target: { name: 'rate', value: sanitizeDecimal(e.target.value) } })}
                      placeholder="e.g. 7200.00"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Total Valuation (₹) <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={openingForm.total_value ? `₹${Number(openingForm.total_value).toLocaleString('en-IN')}` : '₹0'}
                      className="w-full px-3.5 py-2.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs font-bold text-amber-900"
                    />
                  </div>
                </div>
              )}

              {/* 2. DIAMOND FIELDS */}
              {openingForm.material_type === 'diamond' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Quantity / Count (Pcs)
                    </label>
                    <input
                      type="number"
                      min="0"
                      name="quantity"
                      value={openingForm.quantity}
                      onKeyDown={handleIntegerKeyDown}
                      onChange={(e) => handleOpeningInputChange({ target: { name: 'quantity', value: sanitizeInteger(e.target.value) } })}
                      placeholder="e.g. 24"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Carat Weight (ct)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      name="carat_weight"
                      value={openingForm.carat_weight}
                      onKeyDown={handleDecimalKeyDown}
                      onChange={(e) => handleOpeningInputChange({ target: { name: 'carat_weight', value: sanitizeDecimal(e.target.value) } })}
                      placeholder="e.g. 3.500"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Diamond Stamp / Grade Master
                    </label>
                    <select
                      name="stamp"
                      value={openingForm.stamp}
                      onChange={handleOpeningInputChange}
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    >
                      <option value="">-- Select Diamond Stamp/Grade --</option>
                      {stampsList
                        .filter(s => !s.applicable_for || s.applicable_for.toLowerCase().includes('diamond') || s.applicable_for.toLowerCase().includes('all'))
                        .map(s => (
                          <option key={s.id} value={s.name}>{s.name} ({s.code || 'Diamond'})</option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Unit
                    </label>
                    <select
                      name="unit"
                      value={openingForm.unit}
                      onChange={handleOpeningInputChange}
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    >
                      <option value="ct">Carats (ct)</option>
                      <option value="pcs">Pieces (pcs)</option>
                    </select>
                  </div>

                  {claritiesList.length > 0 && (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Clarity (Optional)
                      </label>
                      <select
                        name="clarity"
                        value={openingForm.clarity || ''}
                        onChange={handleOpeningInputChange}
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                      >
                        <option value="">-- Select Clarity --</option>
                        {claritiesList.map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Rate per Carat (₹) <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="rate"
                      value={openingForm.rate}
                      onKeyDown={handleDecimalKeyDown}
                      onChange={(e) => handleOpeningInputChange({ target: { name: 'rate', value: sanitizeDecimal(e.target.value) } })}
                      placeholder="e.g. 45000.00"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Total Valuation (₹) <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={openingForm.total_value ? `₹${Number(openingForm.total_value).toLocaleString('en-IN')}` : '₹0'}
                      className="w-full px-3.5 py-2.5 bg-cyan-50/70 border border-cyan-200 rounded-xl text-xs font-bold text-cyan-900"
                    />
                  </div>
                </div>
              )}

              {/* 3. COLOUR STONES FIELDS */}
              {openingForm.material_type === 'stone' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Quantity / Count (Pcs)
                    </label>
                    <input
                      type="number"
                      min="0"
                      name="quantity"
                      value={openingForm.quantity}
                      onKeyDown={handleIntegerKeyDown}
                      onChange={(e) => handleOpeningInputChange({ target: { name: 'quantity', value: sanitizeInteger(e.target.value) } })}
                      placeholder="e.g. 50"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Weight or Carat
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      name="carat_weight"
                      value={openingForm.carat_weight}
                      onKeyDown={handleDecimalKeyDown}
                      onChange={(e) => handleOpeningInputChange({ target: { name: 'carat_weight', value: sanitizeDecimal(e.target.value) } })}
                      placeholder="e.g. 12.500"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Stone Stamp / Classification Master
                    </label>
                    <select
                      name="stamp"
                      value={openingForm.stamp}
                      onChange={handleOpeningInputChange}
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    >
                      <option value="">-- Select Stone Master Classification --</option>
                      {stampsList
                        .filter(s => !s.applicable_for || s.applicable_for.toLowerCase().includes('stone') || s.applicable_for.toLowerCase().includes('all'))
                        .map(s => (
                          <option key={s.id} value={s.name}>{s.name} ({s.code || 'Stone'})</option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Unit
                    </label>
                    <select
                      name="unit"
                      value={openingForm.unit}
                      onChange={handleOpeningInputChange}
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    >
                      <option value="ct">Carats (ct)</option>
                      <option value="g">Grams (g)</option>
                      <option value="pcs">Pieces (pcs)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Rate per Unit (₹) <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="rate"
                      value={openingForm.rate}
                      onKeyDown={handleDecimalKeyDown}
                      onChange={(e) => handleOpeningInputChange({ target: { name: 'rate', value: sanitizeDecimal(e.target.value) } })}
                      placeholder="e.g. 500.00"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Total Valuation (₹) <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={openingForm.total_value ? `₹${Number(openingForm.total_value).toLocaleString('en-IN')}` : '₹0'}
                      className="w-full px-3.5 py-2.5 bg-purple-50/70 border border-purple-200 rounded-xl text-xs font-bold text-purple-900"
                    />
                  </div>
                </div>
              )}

              {/* 4. SILVER FIELDS */}
              {openingForm.material_type === 'silver' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Weight (g) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      name="weight"
                      value={openingForm.weight}
                      onKeyDown={handleDecimalKeyDown}
                      onChange={(e) => handleOpeningInputChange({ target: { name: 'weight', value: sanitizeDecimal(e.target.value) } })}
                      placeholder="e.g. 250.000"
                      required
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Stamp / Purity Master
                    </label>
                    <select
                      name="stamp"
                      value={openingForm.stamp}
                      onChange={handleOpeningInputChange}
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    >
                      <option value="">-- Select Silver Stamp --</option>
                      {stampsList
                        .filter(s => !s.applicable_for || s.applicable_for.toLowerCase().includes('silver') || s.applicable_for.toLowerCase().includes('all'))
                        .map(s => (
                          <option key={s.id} value={s.name}>{s.name} ({s.code || 'Silver'})</option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Unit
                    </label>
                    <select
                      name="unit"
                      value={openingForm.unit}
                      onChange={handleOpeningInputChange}
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    >
                      <option value="g">Grams (g)</option>
                      <option value="kg">Kilograms (kg)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Rate per Gram (₹) <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="rate"
                      value={openingForm.rate}
                      onKeyDown={handleDecimalKeyDown}
                      onChange={(e) => handleOpeningInputChange({ target: { name: 'rate', value: sanitizeDecimal(e.target.value) } })}
                      placeholder="e.g. 110.00"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Total Valuation (₹) <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={openingForm.total_value ? `₹${Number(openingForm.total_value).toLocaleString('en-IN')}` : '₹0'}
                      className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                    />
                  </div>
                </div>
              )}

              {/* 5. PLATINUM FIELDS */}
              {openingForm.material_type === 'platinum' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Weight (g) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      name="weight"
                      value={openingForm.weight}
                      onKeyDown={handleDecimalKeyDown}
                      onChange={(e) => handleOpeningInputChange({ target: { name: 'weight', value: sanitizeDecimal(e.target.value) } })}
                      placeholder="e.g. 50.000"
                      required
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Stamp / Purity Master
                    </label>
                    <select
                      name="stamp"
                      value={openingForm.stamp}
                      onChange={handleOpeningInputChange}
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    >
                      <option value="">-- Select Platinum Stamp --</option>
                      {stampsList
                        .filter(s => !s.applicable_for || s.applicable_for.toLowerCase().includes('platinum') || s.applicable_for.toLowerCase().includes('all'))
                        .map(s => (
                          <option key={s.id} value={s.name}>{s.name} ({s.code || 'Platinum'})</option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Unit
                    </label>
                    <select
                      name="unit"
                      value={openingForm.unit}
                      onChange={handleOpeningInputChange}
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    >
                      <option value="g">Grams (g)</option>
                      <option value="kg">Kilograms (kg)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Rate per Gram (₹) <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="rate"
                      value={openingForm.rate}
                      onKeyDown={handleDecimalKeyDown}
                      onChange={(e) => handleOpeningInputChange({ target: { name: 'rate', value: sanitizeDecimal(e.target.value) } })}
                      placeholder="e.g. 3500.00"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Total Valuation (₹) <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={openingForm.total_value ? `₹${Number(openingForm.total_value).toLocaleString('en-IN')}` : '₹0'}
                      className="w-full px-3.5 py-2.5 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-900"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* C. REFERENCE, DATE & REASON / AUDIT */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-700">
                    Opening Stock Ref No <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={fetchOpeningNo}
                    disabled={generatingOpeningNo}
                    className="text-[11px] font-bold text-[#b01622] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <i className={`fa-solid fa-arrows-rotate ${generatingOpeningNo ? 'fa-spin' : ''}`}></i> Refresh
                  </button>
                </div>
                <input
                  type="text"
                  name="stock_number"
                  value={openingForm.stock_number}
                  onChange={handleOpeningInputChange}
                  required
                  placeholder="OS-1001"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Entry Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="entry_date"
                  value={openingForm.entry_date}
                  onChange={handleOpeningInputChange}
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Vault Location / Reason Notes
                </label>
                <input
                  type="text"
                  name="notes"
                  value={openingForm.notes}
                  onChange={handleOpeningInputChange}
                  placeholder="e.g. Main Vault Locker #1 Starting Balance"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                />
              </div>
            </div>

            {/* ACTION BAR */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div className="text-xs text-gray-500">
                <i className="fa-solid fa-circle-info text-amber-600 mr-1"></i>
                Saving will update the <strong className="text-gray-800">existing {openingForm.material_type} vault balance</strong> directly with an audit trail.
              </div>

              <button
                type="submit"
                disabled={openingSaving}
                className="px-8 py-3 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                {openingSaving ? (
                  <i className="fa-solid fa-circle-notch fa-spin"></i>
                ) : (
                  <>
                    <i className="fa-solid fa-vault text-xs"></i>
                    Save Opening Stock & Credit Vault Balance
                  </>
                )}
              </button>
            </div>
          </form>

          {/* OPENING STOCK RECORDED LOG TABLE */}
          {(() => {
            const openingTotalPages = Math.ceil(openingStockEntries.length / openingItemsPerPage) || 1;
            const currentOpeningPage = Math.min(openingCurrentPage, openingTotalPages);
            const paginatedOpeningStockEntries = openingStockEntries.slice(
              (currentOpeningPage - 1) * openingItemsPerPage,
              currentOpeningPage * openingItemsPerPage
            );

            return (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <i className="fa-solid fa-clock-rotate-left text-amber-700"></i>
                    <h3 className="text-sm font-bold text-gray-900">Recorded Opening Stock Audit Entries</h3>
                    <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {openingStockEntries.length} Records
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={fetchOpeningStockEntries}
                    className="text-xs text-gray-600 hover:text-gray-900 font-semibold cursor-pointer"
                  >
                    <i className="fa-solid fa-rotate mr-1"></i> Refresh Log
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      <tr>
                        <th className="py-3 px-4">Stock Ref No</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Material</th>
                        <th className="py-3 px-4">Stamp / Grade</th>
                        <th className="py-3 px-4">Karat</th>
                        <th className="py-3 px-4 text-right">Weight</th>
                        <th className="py-3 px-4 text-right">Carats</th>
                        <th className="py-3 px-4 text-right">Quantity</th>
                        <th className="py-3 px-4 text-right">Valuation</th>
                        <th className="py-3 px-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paginatedOpeningStockEntries.length > 0 ? (
                        paginatedOpeningStockEntries.map((entry) => (
                          <tr key={entry.id} className="hover:bg-amber-50/30 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-gray-900">{entry.stock_number}</td>
                            <td className="py-3 px-4 text-gray-600">{entry.entry_date}</td>
                            <td className="py-3 px-4 font-semibold capitalize">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                entry.material_type === 'gold' ? 'bg-amber-100 text-amber-800' :
                                entry.material_type === 'diamond' ? 'bg-cyan-100 text-cyan-800' :
                                entry.material_type === 'stone' ? 'bg-purple-100 text-purple-800' :
                                'bg-slate-100 text-slate-800'
                              }`}>
                                {entry.material_type}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-800 font-medium">{entry.stamp || '—'}</td>
                            <td className="py-3 px-4 text-gray-600">{entry.karat || '—'}</td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                              {entry.weight ? `${Number(entry.weight).toFixed(3)} ${entry.unit || 'g'}` : '—'}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-cyan-900">
                              {entry.carat_weight ? `${Number(entry.carat_weight).toFixed(3)} ct` : '—'}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-gray-700">
                              {entry.quantity ? `${Number(entry.quantity)} pcs` : '—'}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                              {entry.total_value ? `₹${Number(entry.total_value).toLocaleString('en-IN')}` : '—'}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteOpeningStock(entry.id, entry.stock_number)}
                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Reverse Opening Stock"
                              >
                                <i className="fa-solid fa-trash-can text-xs"></i>
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={10} className="py-8 text-center text-gray-400">
                            No opening stock records found. Use the form above to add initial business stock.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {openingStockEntries.length > 0 && (
                  <div className="border-t border-gray-100">
                    <Pagination
                      currentPage={currentOpeningPage}
                      totalPages={openingTotalPages}
                      totalItems={openingStockEntries.length}
                      itemsPerPage={openingItemsPerPage}
                      onPageChange={(page) => setOpeningCurrentPage(page)}
                      onItemsPerPageChange={(num) => {
                        setOpeningItemsPerPage(num);
                        setOpeningCurrentPage(1);
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* 4. UNIFIED AVAILABLE STOCK VIEW */}
      {activeTab === 'stock' && (
        <div className="space-y-6">
          {/* Summary Metric Cards (5 Columns: Gold, Diamond, Platinum, Stones, Silver) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-2xs">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center text-sm font-bold">
                  <i className="fa-solid fa-coins"></i>
                </div>
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Available Gold</span>
              </div>
              <div className="text-xl font-black text-stone-900 font-mono">
                {Number(unifiedStockData?.summary?.gold_total_weight || 0).toFixed(3)} <span className="text-xs font-bold text-amber-700">g</span>
              </div>
              <p className="text-[11px] text-stone-400 mt-1">24K / 22K pure & alloy balance</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-cyan-200/80 shadow-2xs">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center text-sm font-bold">
                  <i className="fa-solid fa-gem"></i>
                </div>
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Available Diamonds</span>
              </div>
              <div className="text-xl font-black text-cyan-950 font-mono">
                {Number(unifiedStockData?.summary?.diamond_total_carats || 0).toFixed(3)} <span className="text-xs font-bold text-cyan-700">ct</span>
              </div>
              <p className="text-[11px] text-stone-500 font-semibold mt-1">
                {Number(unifiedStockData?.summary?.diamond_total_count || 0)} pcs in vault
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-indigo-200/80 shadow-2xs">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center text-sm font-bold">
                  <i className="fa-solid fa-crown"></i>
                </div>
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Available Platinum</span>
              </div>
              <div className="text-xl font-black text-indigo-950 font-mono">
                {Number(unifiedStockData?.summary?.platinum_total_weight || 0).toFixed(3)} <span className="text-xs font-bold text-indigo-700">g</span>
              </div>
              <p className="text-[11px] text-stone-400 mt-1">950 Pt pure platinum balance</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-purple-200/80 shadow-2xs">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center text-sm font-bold">
                  <i className="fa-solid fa-shapes"></i>
                </div>
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Colour Stones</span>
              </div>
              <div className="text-xl font-black text-stone-900 font-mono">
                {Number(unifiedStockData?.summary?.stone_total_count || 0)} <span className="text-xs font-bold text-purple-700">pcs</span>
              </div>
              <p className="text-[11px] text-stone-400 mt-1">Precious & semi-precious stock</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-700 flex items-center justify-center text-sm font-bold">
                  <i className="fa-solid fa-ring"></i>
                </div>
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Available Silver</span>
              </div>
              <div className="text-xl font-black text-stone-900 font-mono">
                {Number(unifiedStockData?.summary?.silver_total_weight || 0).toFixed(3)} <span className="text-xs font-bold text-slate-700">g</span>
              </div>
              <p className="text-[11px] text-stone-400 mt-1">92.5 sterling / fine balance</p>
            </div>
          </div>

          {/* Unified Available Stock Summary Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-scale-balanced text-[#b01622]"></i>
                <h2 className="text-base font-bold text-gray-900">Unified Available Stock Summary</h2>
                <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  Purchases + Opening Stock
                </span>
              </div>
              <button
                type="button"
                onClick={fetchUnifiedStock}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <i className={`fa-solid fa-arrows-rotate mr-1 ${unifiedLoading ? 'fa-spin' : ''}`}></i> Refresh Stock
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="py-3.5 px-4">Material Type</th>
                    <th className="py-3.5 px-4">Stamp / Purity / Grade</th>
                    <th className="py-3.5 px-4">Karat</th>
                    <th className="py-3.5 px-4">Unit</th>
                    <th className="py-3.5 px-4 text-right">Available Weight</th>
                    <th className="py-3.5 px-4 text-right">Available Carat Weight</th>
                    <th className="py-3.5 px-4 text-right">Available Quantity / Count</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Array.isArray(unifiedStockData?.unified_rows) && unifiedStockData.unified_rows.length > 0 ? (
                    unifiedStockData.unified_rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-gray-900 flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${
                            row.material_type === 'Gold' ? 'bg-amber-500' :
                            row.material_type === 'Diamond' ? 'bg-cyan-500' :
                            row.material_type === 'Platinum' ? 'bg-indigo-600' :
                            row.material_type === 'Silver' ? 'bg-slate-500' : 'bg-purple-500'
                          }`}></span>
                          {row.material_type}
                        </td>
                        <td className="py-3.5 px-4 text-gray-800 font-semibold">{row.stamp_grade || '—'}</td>
                        <td className="py-3.5 px-4 text-gray-600">{row.karat || '—'}</td>
                        <td className="py-3.5 px-4 font-mono text-gray-700 font-semibold">{row.unit}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-gray-900">
                          {row.available_weight !== null ? `${Number(row.available_weight).toFixed(3)} g` : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-cyan-900">
                          {row.available_carat_weight !== null ? `${Number(row.available_carat_weight).toFixed(3)} ct` : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-gray-800">
                          {row.available_quantity !== null ? `${Number(row.available_quantity)} pcs` : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenEditStockModal(row)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-[#b01622] text-stone-700 hover:text-white rounded-xl text-xs font-bold transition-all shadow-2xs hover:shadow-xs cursor-pointer group"
                            title={`Edit ${row.material_type} Stock`}
                          >
                            <i className="fa-solid fa-pen-to-square text-[#b01622] group-hover:text-white transition-colors"></i>
                            <span>Edit</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-400">
                        {unifiedLoading ? 'Loading authoritative stock balance...' : 'No stock balance records found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* GOLD STOCK BY KARAT / PURITY BREAKDOWN TABLE */}
          <div id="gold-stock-section" className="bg-white rounded-2xl border border-amber-200/90 shadow-xs overflow-hidden scroll-mt-6">
            <div className="p-4 border-b border-amber-100 bg-amber-50/40 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-coins text-amber-600"></i>
                <h3 className="text-base font-bold text-gray-900">Gold Stock by Karat / Purity Breakdown</h3>
                <span className="bg-amber-100 text-amber-900 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  Separate Balances per Karat (24K, 22K, 18K...)
                </span>
              </div>

              <div className="relative w-48 sm:w-60">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                <input
                  type="text"
                  placeholder="Filter gold karat (24K, 22K)..."
                  value={goldFilterKarat}
                  onChange={(e) => setGoldFilterKarat(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-amber-50/60 text-[10px] font-bold text-amber-950 uppercase tracking-wider border-b border-amber-100">
                  <tr>
                    <th className="py-3 px-4">Gold Karat / Purity</th>
                    <th className="py-3 px-4">Standard Stamp</th>
                    <th className="py-3 px-4">Purity / Touch</th>
                    <th className="py-3 px-4 text-right">Available Weight (g)</th>
                    <th className="py-3 px-4 text-right">Fine 24K Equiv (g)</th>
                    <th className="py-3 px-4 text-center">Unit</th>
                    <th className="py-3 px-4 text-center">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Array.isArray(unifiedStockData?.gold_by_karat) && unifiedStockData.gold_by_karat.length > 0 ? (
                    unifiedStockData.gold_by_karat
                      .filter(g => !goldFilterKarat || g.karat.toLowerCase().includes(goldFilterKarat.toLowerCase()) || (g.stamp && g.stamp.toLowerCase().includes(goldFilterKarat.toLowerCase())))
                      .map((g, idx) => (
                        <tr key={idx} className="hover:bg-amber-50/30 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-gray-900 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                            <span className="text-amber-900 font-extrabold text-sm">{g.karat}</span>
                            <span className="text-gray-500 font-normal text-[11px] hidden sm:inline">({g.description})</span>
                          </td>
                          <td className="py-3.5 px-4 text-gray-800 font-semibold">{g.stamp || '—'}</td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              {g.purity}% Touch
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-black text-amber-950 text-sm">
                            {Number(g.available_weight || 0).toFixed(3)} g
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-semibold text-gray-700">
                            {Number(g.fine_weight_equiv || 0).toFixed(3)} g
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono text-gray-500">{g.unit || 'g'}</td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditStockModal({
                                    isOpen: true,
                                    row: null,
                                    materialType: 'Gold',
                                    stampGrade: g.stamp,
                                    unit: 'g',
                                    availableWeight: String(g.available_weight || '0'),
                                    availableCaratWeight: '',
                                    availableQuantity: '',
                                    karat: g.karat,
                                    stamp: g.stamp,
                                    notes: `Adjustment for ${g.karat} gold balance`,
                                    saving: false,
                                  });
                                }}
                                className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                                title={`Edit ${g.karat} Gold Stock`}
                              >
                                <i className="fa-solid fa-pen-to-square text-xs"></i>
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleOpeningMaterialChange('gold');
                                  setOpeningForm(prev => ({ ...prev, karat: g.karat, stamp: g.stamp, purity: g.purity }));
                                  setActiveTab('opening');
                                }}
                                className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                              >
                                + Add Opening
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400">
                        No gold karat records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* DIAMOND STOCK BY STAMP TABLE */}
          {(() => {
            const filteredDiamondStamps = Array.isArray(unifiedStockData?.diamond_by_stamp)
              ? unifiedStockData.diamond_by_stamp.filter(d => !diamondFilterStamp || (d.stamp && d.stamp.toLowerCase().includes(diamondFilterStamp.toLowerCase())))
              : [];
            const diamondTotalPages = Math.ceil(filteredDiamondStamps.length / diamondItemsPerPage) || 1;
            const paginatedDiamondStamps = filteredDiamondStamps.slice(
              (diamondCurrentPage - 1) * diamondItemsPerPage,
              diamondCurrentPage * diamondItemsPerPage
            );

            return (
              <div id="diamond-stock-section" className="bg-white rounded-2xl border border-cyan-200/90 shadow-xs overflow-hidden scroll-mt-6">
                <div className="p-4 border-b border-cyan-100 bg-cyan-50/40 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <i className="fa-solid fa-gem text-cyan-600"></i>
                    <h3 className="text-base font-bold text-gray-900">Diamond Stock by Stamp / Grade Breakdown</h3>
                    <span className="bg-cyan-100 text-cyan-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                      Separate Balances per Stamp
                    </span>
                  </div>

                  <div className="relative w-48 sm:w-60">
                    <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                    <input
                      type="text"
                      placeholder="Filter diamond stamp..."
                      value={diamondFilterStamp}
                      onChange={(e) => {
                        setDiamondFilterStamp(e.target.value);
                        setDiamondCurrentPage(1);
                      }}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-cyan-50/60 text-[10px] font-bold text-cyan-900 uppercase tracking-wider border-b border-cyan-100">
                      <tr>
                        <th className="py-3 px-4">Diamond Stamp / Grade</th>
                        <th className="py-3 px-4 text-right">Available Weight (g)</th>
                        <th className="py-3 px-4 text-right">Available Carat Weight (ct)</th>
                        <th className="py-3 px-4 text-right">Available Count (Pcs)</th>
                        <th className="py-3 px-4 text-center">Unit</th>
                        <th className="py-3 px-4 text-center">Quick Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paginatedDiamondStamps.length > 0 ? (
                        paginatedDiamondStamps.map((d, idx) => (
                          <tr key={idx} className="hover:bg-cyan-50/30 transition-colors">
                            <td className="py-3 px-4 font-bold text-gray-900 flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-cyan-600"></span>
                              {d.stamp}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-semibold text-gray-800">
                              {Number(d.available_weight !== undefined ? d.available_weight : (d.available_carats || 0) * 0.2).toFixed(3)} g
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-black text-cyan-950">
                              {Number(d.available_carats || 0).toFixed(3)} ct
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-semibold text-gray-700">
                              {Number(d.available_count || 0)} pcs
                            </td>
                            <td className="py-3 px-4 text-center font-mono text-gray-500">{d.unit || 'ct'}</td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditStockModal({
                                      isOpen: true,
                                      row: null,
                                      materialType: 'Diamond',
                                      stampGrade: d.stamp,
                                      unit: d.unit || 'ct',
                                      availableWeight: String(d.available_weight !== undefined ? d.available_weight : ((d.available_carats || 0) * 0.2).toFixed(3)),
                                      availableCaratWeight: String(d.available_carats !== undefined ? d.available_carats : '0'),
                                      availableQuantity: String(d.available_count !== undefined ? d.available_count : '0'),
                                      karat: '',
                                      stamp: d.stamp,
                                      notes: `Adjustment for ${d.stamp} diamond balance`,
                                      saving: false,
                                    });
                                  }}
                                  className="px-2.5 py-1 bg-cyan-100 hover:bg-cyan-200 text-cyan-900 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                                  title={`Edit ${d.stamp} Diamond Stock`}
                                >
                                  <i className="fa-solid fa-pen-to-square text-xs"></i>
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleOpeningMaterialChange('diamond');
                                    setOpeningForm(prev => ({ ...prev, stamp: d.stamp }));
                                    setActiveTab('opening');
                                  }}
                                  className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                                >
                                  + Add Opening Stock
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-gray-400">
                            {diamondFilterStamp
                              ? 'No diamond stamps matching filter.'
                              : 'No diamond stamps recorded yet. Add opening diamond stock to view breakdown.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {filteredDiamondStamps.length > 0 && (
                  <div className="border-t border-cyan-100 bg-cyan-50/20">
                    <Pagination
                      currentPage={diamondCurrentPage}
                      totalPages={diamondTotalPages}
                      totalItems={filteredDiamondStamps.length}
                      itemsPerPage={diamondItemsPerPage}
                      onPageChange={(page) => setDiamondCurrentPage(page)}
                      onItemsPerPageChange={(num) => {
                        setDiamondItemsPerPage(num);
                        setDiamondCurrentPage(1);
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })()}
        </div>
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
                            {item.product?.name || item.raw_material?.name || item.item_name || (isRaw ? `${item.metal_type?.toUpperCase()} Vault Stock` : 'Jewellery Product')}
                          </div>
                        </td>

                        {/* Weight & Touch */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="font-bold text-amber-700">{item.weight} {item.unit || 'g'}</div>
                          {item.count_qty > 0 && (
                            <div className="text-[10px] text-gray-600 font-medium">Count: {item.count_qty}</div>
                          )}
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

      {/* EDIT STOCK BALANCE MODAL */}
      {editStockModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base ${
                  editStockModal.materialType === 'Gold' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                  editStockModal.materialType === 'Diamond' ? 'bg-cyan-50 text-cyan-600 border border-cyan-200' :
                  editStockModal.materialType === 'Platinum' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                  editStockModal.materialType === 'Silver' ? 'bg-slate-100 text-slate-700 border border-slate-200' :
                  'bg-purple-50 text-purple-600 border border-purple-200'
                }`}>
                  <i className={`fa-solid ${
                    editStockModal.materialType === 'Gold' ? 'fa-coins' :
                    editStockModal.materialType === 'Diamond' ? 'fa-gem' :
                    editStockModal.materialType === 'Platinum' ? 'fa-crown' :
                    editStockModal.materialType === 'Silver' ? 'fa-ring' : 'fa-shapes'
                  }`}></i>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">
                    Edit {editStockModal.karat ? `${editStockModal.karat} ` : ''}{editStockModal.materialType} Stock
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Update current available balance in Unified Stock Ledger
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseEditStockModal}
                className="text-gray-400 hover:text-gray-600 cursor-pointer p-1"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEditStock} className="space-y-4 pt-4 text-xs">
              {/* Material Info Badge */}
              <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Material Type</span>
                  <span className="font-bold text-stone-900 text-xs">{editStockModal.materialType}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Grade / Karat</span>
                  <span className="font-semibold text-stone-700 text-xs">{editStockModal.karat || editStockModal.stampGrade || 'Standard'}</span>
                </div>
              </div>

              {/* Gold Karat Selection if editing Gold */}
              {editStockModal.materialType === 'Gold' && (
                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Target Gold Karat / Purity
                  </label>
                  <select
                    value={editStockModal.karat || ''}
                    onChange={(e) => setEditStockModal(prev => ({ ...prev, karat: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-900 focus:outline-hidden focus:border-[#b01622] cursor-pointer"
                  >
                    <option value="">All Gold Karats (Overall Gold Balance)</option>
                    <option value="24K">24K (999 Pure Fine Gold)</option>
                    <option value="22K">22K (916 Hallmark Standard)</option>
                    <option value="18K">18K (750 Fine Gold)</option>
                    <option value="14K">14K (585 Hallmark Gold)</option>
                  </select>
                </div>
              )}

              {/* Diamond Stamp Target if editing Diamond with a specific stamp */}
              {editStockModal.materialType === 'Diamond' && editStockModal.stamp && (
                <div className="bg-cyan-50/70 border border-cyan-200/80 rounded-xl p-2.5 flex items-center justify-between text-xs text-cyan-900">
                  <span className="font-semibold flex items-center gap-1.5">
                    <i className="fa-solid fa-gem text-cyan-600 text-[11px]"></i>
                    Diamond Stamp / Grade:
                  </span>
                  <span className="font-mono font-bold bg-white px-2.5 py-0.5 rounded-md border border-cyan-200 text-cyan-950">{editStockModal.stamp}</span>
                </div>
              )}

              {/* Dynamic Inputs according to Material */}
              {editStockModal.materialType === 'Diamond' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-700 font-bold mb-1">
                        Available Carats (ct) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          required
                          value={editStockModal.availableCaratWeight}
                          onChange={(e) => {
                            const val = e.target.value;
                            const num = parseFloat(val) || 0;
                            setEditStockModal(prev => ({
                              ...prev,
                              availableCaratWeight: val,
                              availableWeight: (num * 0.2).toFixed(3),
                            }));
                          }}
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 pr-10 text-xs font-mono font-bold text-cyan-950 focus:outline-hidden focus:border-[#b01622]"
                          placeholder="0.000"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-cyan-700 font-mono">ct</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold mb-1">
                        Gram Weight (g) <span className="text-stone-400 font-normal">(ct × 0.2)</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          value={editStockModal.availableWeight}
                          onChange={(e) => {
                            const val = e.target.value;
                            const num = parseFloat(val) || 0;
                            setEditStockModal(prev => ({
                              ...prev,
                              availableWeight: val,
                              availableCaratWeight: (num / 0.2).toFixed(3),
                            }));
                          }}
                          className="w-full bg-stone-50 border border-gray-200 rounded-lg px-3 py-2 pr-8 text-xs font-mono font-bold text-gray-800 focus:outline-hidden focus:border-[#b01622]"
                          placeholder="0.000"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-500 font-mono">g</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">
                      Available Piece Count (pcs)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={editStockModal.availableQuantity}
                        onChange={(e) => setEditStockModal(prev => ({ ...prev, availableQuantity: e.target.value }))}
                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 pr-10 text-xs font-mono font-bold text-gray-800 focus:outline-hidden focus:border-[#b01622]"
                        placeholder="0"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-500 font-mono">pcs</span>
                    </div>
                  </div>
                </>
              ) : editStockModal.materialType === 'Colour Stones' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-700 font-bold mb-1">
                        Available Weight / Carat (ct / g) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          required
                          value={editStockModal.availableWeight}
                          onChange={(e) => setEditStockModal(prev => ({
                            ...prev,
                            availableWeight: e.target.value,
                            availableCaratWeight: e.target.value,
                          }))}
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 pr-12 text-xs font-mono font-bold text-purple-950 focus:outline-hidden focus:border-[#b01622]"
                          placeholder="0.000"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-purple-700 font-mono">ct / g</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold mb-1">
                        Quantity / Piece Count (pcs)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={editStockModal.availableQuantity}
                          onChange={(e) => setEditStockModal(prev => ({ ...prev, availableQuantity: e.target.value }))}
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 pr-10 text-xs font-mono font-bold text-gray-800 focus:outline-hidden focus:border-[#b01622]"
                          placeholder="0"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-500 font-mono">pcs</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* Gold or Silver */
                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Available Weight (g) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      required
                      value={editStockModal.availableWeight}
                      onChange={(e) => setEditStockModal(prev => ({ ...prev, availableWeight: e.target.value }))}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 pr-8 text-xs font-mono font-bold text-gray-900 focus:outline-hidden focus:border-[#b01622]"
                      placeholder="0.000"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-stone-500 font-mono">g</span>
                  </div>
                </div>
              )}

              {/* Adjustment Reason / Notes */}
              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Reason / Notes <span className="text-stone-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows="2"
                  value={editStockModal.notes}
                  onChange={(e) => setEditStockModal(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="e.g. Physical inventory audit adjustment, scrap recovery addition..."
                  className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs text-gray-900 focus:outline-hidden focus:border-[#b01622] resize-none"
                ></textarea>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCloseEditStockModal}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editStockModal.saving}
                  className="px-5 py-2 bg-[#b01622] text-white rounded-lg text-xs font-semibold hover:bg-[#90121b] cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  {editStockModal.saving ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-check"></i>
                      <span>Save Stock Balance</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
