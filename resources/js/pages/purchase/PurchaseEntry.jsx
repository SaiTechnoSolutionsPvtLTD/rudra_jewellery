
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api, { sanitizeErrorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Pagination from '../../components/Pagination';
import PurchaseDetailsModal from '../../components/PurchaseDetailsModal';
import ConvertPurchasePaymentModeModal from '../../components/ConvertPurchasePaymentModeModal';
import { handleIntegerKeyDown, handleDecimalKeyDown, sanitizeInteger, sanitizeDecimal, normalizeNumericInput, handleNumericFocus } from '../../utils/numberInputUtils';

// Helper to cleanly format karat dropdown labels without awkward redundant codes like "24k (24)"
const formatKaratLabel = (k) => {
  if (!k) return '';
  if (!k.code) return k.name || '';
  const nameTrim = (k.name || '').trim();
  const codeTrim = (k.code || '').trim();
  const nameNorm = nameTrim.toLowerCase().replace(/k$/, '').trim();
  const codeNorm = codeTrim.toLowerCase().replace(/k$/, '').trim();
  if (codeTrim.toLowerCase() === nameTrim.toLowerCase() || nameNorm === codeNorm) {
    return k.name;
  }
  return `${k.name} (${k.code})`;
};

export default function PurchaseEntry({ initialTab }) {
  const { showToast, showConfirm } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [selectedPurchaseForView, setSelectedPurchaseForView] = useState(null);
  const [convertPurchaseModal, setConvertPurchaseModal] = useState(null);

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
  const [customStampMode, setCustomStampMode] = useState(false);
  // Purchase Category: 'gold' | 'silver' | 'diamond' | 'finished'
  const [purchaseCategory, setPurchaseCategory] = useState('gold');

  // Repeatable Diamond component-rows for Diamond and Finished Jewellery purchase
  const [diamondRows, setDiamondRows] = useState([
    { stamp: '+5 Sieve', diamond_type: 'Round Brilliant', stones_count: '1', weight_carats: '1.000', rate_per_carat: '', row_value: '', notes: '' }
  ]);
  // Repeatable Colour Stone component-rows for Finished Jewellery purchase
  const [stoneRows, setStoneRows] = useState([]);

  // Single Product / Raw Material Purchase Form State
  const initialFormState = {
    purchase_no: '',
    supplier_id: '',
    purchase_type: 'raw_material', // 'raw_material' | 'finished_product'
    product_id: '',
    raw_material_id: '',
    stamp: '',
    count_qty: '',
    unit: 'g',
    category_id: '',
    subcategory_id: '',
    item_name: '',
    product_code: '',
    design_no: '',
    gold_karat: '22K',
    gold_stamp: '916',
    setting_type: 'Prong',
    diamond_weight: '',
    diamond_count: '',
    diamond_stamp: '',
    diamond_clarity: '',
    diamond_color: '',
    color_stone_weight: '',
    color_stone_count: '',
    color_stone_stamp: '',
    metal_type: 'gold',
    purity: '22K (916)',
    qty: 1,
    weight: '', // Gross Wt
    less_weight: '', // Less Wt / Stone Wt (ct)
    net_weight: '', // Net Wt
    touch: 91.667,
    wastage_percent: '', // Wastage (%) added to Touch
    making_charge_type: 'total', // 'total' | 'per_gram' | 'per_ct'
    making_charge_rate: '', // Labour / Making charge rate per gram (₹/g) or per ct (₹/ct)
    making_charge: '',
    fine_weight: '',
    stone_weight: '',
    stone_cost: '',
    rate: '',
    cgst_percent: '', // Optional CGST %
    cgst_amount: '',
    sgst_percent: '', // Optional SGST %
    sgst_amount: '',
    igst_percent: '', // Optional IGST %
    igst_amount: '',
    total_tax_amount: '',
    credit_days: '', // Credit period in days
    due_date: '', // Payment due date
    payment_status: 'unpaid', // 'unpaid' | 'partial' | 'paid'
    paid_amount: '',
    total_amount: '',
    purchase_date: new Date().toISOString().split('T')[0],
    notes: '',
    image: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  // Dedicated Opening Stock State
  const initialOpeningState = {
    stock_number: '',
    material_type: 'gold', // 'gold' | 'diamond' | 'stone' | 'silver' | 'platinum'
    stamp: '',
    karat: '',
    purity: '',
    unit: '',
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
  const [openingSearchTerm, setOpeningSearchTerm] = useState('');
  const [openingFilterMaterial, setOpeningFilterMaterial] = useState('all');
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
  const [allSubcategories, setAllSubcategories] = useState([]);
  const [stylesList, setStylesList] = useState([]);

  const fetchPurchaseNo = async () => {
    try {
      setGeneratingNo(true);
      const res = await api.get('/purchase-entries/generate-no').catch(() => ({ data: null }));
      if (res.data && res.data.purchase_no) {
        setFormData(prev => ({ ...prev, purchase_no: res.data.purchase_no }));
      }
    } catch (err) {
      console.warn('Error generating purchase no:', err);
    } finally {
      setGeneratingNo(false);
    }
  };

  const fetchOpeningNo = async () => {
    try {
      setGeneratingOpeningNo(true);
      const res = await api.get('/material-opening-stocks/generate-no').catch(() => ({ data: null }));
      if (res.data && res.data.stock_number) {
        setOpeningForm(prev => ({ ...prev, stock_number: res.data.stock_number }));
      }
    } catch (err) {
      console.warn('Error generating opening stock no:', err);
    } finally {
      setGeneratingOpeningNo(false);
    }
  };

  // Fetch initial data (Suppliers, Products, Categories, Masters, Opening Stocks, Unified Ledger)
  const fetchData = async () => {
    try {
      setLoading(true);
      const [
        supRes, prodRes, catRes, rawMatRes, entryRes,
        stampRes, karatRes, unitRes, clarityRes, colorRes,
        opRes, uniRes, subRes, styleRes
      ] = await Promise.all([
        api.get('/suppliers').catch(err => { console.warn('Failed to load suppliers:', err); return { data: [] }; }),
        api.get('/products').catch(err => { console.warn('Failed to load products:', err); return { data: [] }; }),
        api.get('/categories').catch(() => ({ data: [] })),
        api.get('/raw-materials').catch(() => ({ data: [] })),
        api.get('/purchase-entries').catch(err => { console.warn('Failed to load purchase entries:', err); return { data: [] }; }),
        api.get('/stamps').catch(() => ({ data: [] })),
        api.get('/karats').catch(() => ({ data: [] })),
        api.get('/units').catch(() => ({ data: [] })),
        api.get('/diamond-clarities').catch(() => ({ data: [] })),
        api.get('/diamond-colors').catch(() => ({ data: [] })),
        api.get('/material-opening-stocks').catch(() => ({ data: { data: [] } })),
        api.get('/raw-materials/unified-stock').catch(() => ({ data: null })),
        api.get('/subcategories').catch(() => ({ data: [] })),
        api.get('/styles').catch(() => ({ data: [] })),
      ]);

      const rawSuppliers = Array.isArray(supRes?.data?.data) ? supRes.data.data : (Array.isArray(supRes?.data) ? supRes.data : []);
      const activeSuppliers = rawSuppliers.filter(s => s && (!s.status || s.status === 'active'));

      const rawProducts = Array.isArray(prodRes?.data?.data) ? prodRes.data.data : (Array.isArray(prodRes?.data) ? prodRes.data : []);
      const activeProducts = rawProducts.filter(p => p && (!p.status || p.status === 'active'));

      const rawCategories = Array.isArray(catRes?.data?.data) ? catRes.data.data : (Array.isArray(catRes?.data) ? catRes.data : []);
      const rawMats = Array.isArray(rawMatRes?.data) ? rawMatRes.data : (rawMatRes?.data?.data || []);
      const rawEntries = Array.isArray(entryRes?.data?.data) ? entryRes.data.data : (Array.isArray(entryRes?.data) ? entryRes.data : []);

      setSuppliers(activeSuppliers);
      setProducts(activeProducts);
      setCategories(rawCategories);
      setRawMaterials(rawMats);
      setPurchaseEntries(rawEntries);

      // Masters
      const rawStamps = Array.isArray(stampRes?.data) ? stampRes.data : (stampRes?.data?.data || []);
      setStampsList(rawStamps);
      const diaStamps = rawStamps.filter(s => {
        const app = (s?.applicable_for || '').toLowerCase();
        return app.includes('diamond') || app.includes('all') || !app;
      });
      if (diaStamps.length > 0) {
        setDiamondRows(prev => {
          if (prev.length === 1 && (!prev[0].stamp || prev[0].stamp === '+5 Sieve' || prev[0].stamp === '')) {
            return [{ ...prev[0], stamp: diaStamps[0].name }];
          }
          return prev;
        });
      }
      setKaratsList(Array.isArray(karatRes?.data) ? karatRes.data : (karatRes?.data?.data || []));
      setUnitsList(Array.isArray(unitRes?.data) ? unitRes.data : (unitRes?.data?.data || []));
      setClaritiesList(Array.isArray(clarityRes?.data) ? clarityRes.data : (clarityRes?.data?.data || []));
      setColorsList(Array.isArray(colorRes?.data) ? colorRes.data : (colorRes?.data?.data || []));
      setAllSubcategories(Array.isArray(subRes?.data) ? subRes.data : (subRes?.data?.data || []));
      setStylesList(Array.isArray(styleRes?.data) ? styleRes.data : (styleRes?.data?.data || []));

      // Auto-synchronize Opening Stock form with loaded masters so nothing is hardcoded or unlinked
      setOpeningForm(prev => {
        const goldStamps = rawStamps.filter(s => {
          const app = (s?.applicable_for || '').toLowerCase();
          return !app || app.includes('gold') || app.includes('all');
        });
        const defStamp = goldStamps.find(s => s.name?.includes('916') || s.code?.includes('916')) || goldStamps[0];
        const rawKList = Array.isArray(karatRes?.data) ? karatRes.data : (karatRes?.data?.data || []);
        const defKarat = rawKList.find(k => k.name?.includes('22') || k.code?.includes('22')) || rawKList[0];
        const rawUList = Array.isArray(unitRes?.data) ? unitRes.data : (unitRes?.data?.data || []);
        const defUnit = rawUList.find(u => u.code?.toLowerCase() === 'g' || u.name?.toLowerCase().includes('gram')) || rawUList[0];

        return {
          ...prev,
          stamp: prev.stamp || defStamp?.name || '',
          karat: prev.karat || defKarat?.name || '',
          purity: prev.purity || (defStamp?.name?.includes('916') ? '91.6' : '91.6'),
          unit: prev.unit || defUnit?.code || defUnit?.name || 'g',
        };
      });

      // Opening stocks & unified ledger
      setOpeningStockEntries(Array.isArray(opRes?.data?.data) ? opRes.data.data : (Array.isArray(opRes?.data) ? opRes.data : []));
      if (uniRes?.data?.status === 'success') {
        setUnifiedStockData(uniRes.data);
      }

      // Auto-prefill if redirected from Low Stock Alerts / Restock buttons
      if (location?.state) {
        if (location.state.purchase_type === 'raw_material') {
          const matType = (location.state.metal_type || 'gold').toLowerCase();
          const targetRm = rawMats.find(rm =>
            (location.state.raw_material_id && (String(rm?.id) === String(location.state.raw_material_id) || String(rm?.id) === String(location.state.raw_material_id).replace('raw_', ''))) ||
            (rm?.material_type?.toLowerCase() === matType)
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
          const targetProd = activeProducts.find(p => String(p?.id) === String(location.state.productId));
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
      console.warn('Notice loading purchase entry data:', err);
    } finally {
      setLoading(false);
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
    const handleUpdate = () => fetchData();
    window.addEventListener('rudhra_stamps_updated', handleUpdate);
    window.addEventListener('rudhra_inventory_updated', handleUpdate);
    return () => {
      window.removeEventListener('rudhra_stamps_updated', handleUpdate);
      window.removeEventListener('rudhra_inventory_updated', handleUpdate);
    };
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
      const isDia = (rm.material_type || '').toLowerCase() === 'diamond' ||
        (rm.name || '').toLowerCase().includes('diamond') ||
        (rm.unit || '').toLowerCase() === 'ct';
      const isSt = (rm.material_type || '').toLowerCase().includes('stone') ||
        (rm.name || '').toLowerCase().includes('stone') ||
        (rm.name || '').toLowerCase().includes('ruby') ||
        (rm.name || '').toLowerCase().includes('emerald') ||
        (rm.name || '').toLowerCase().includes('sapphire') ||
        (rm.name || '').toLowerCase().includes('gem');

      const diaStamps = stampsList.filter(s => {
        const app = (s.applicable_for || '').toLowerCase();
        return app.includes('diamond') || app.includes('all') || !app;
      });
      const stStamps = stampsList.filter(s => {
        const app = (s.applicable_for || '').toLowerCase();
        return app.includes('stone') || app.includes('all') || !app;
      });

      const defaultDiaStamp = (isDia && diaStamps.length > 0) ? diaStamps[0].name : '';
      const defaultStStamp = (isSt && stStamps.length > 0) ? stStamps[0].name : '';
      const defaultStamp = defaultDiaStamp || defaultStStamp || '';

      setFormData(prev => ({
        ...prev,
        raw_material_id: rm.id,
        metal_type: isDia ? 'diamond' : (isSt ? 'stone' : (rm.material_type || prev.metal_type)),
        unit: rm.unit || (isDia ? 'ct' : (isSt ? 'ct' : (prev.unit || 'g'))),
        purity: rm.purity || prev.purity || (isSt ? 'Natural Gemstone' : ''),
        stamp: prev.stamp || defaultStamp,
        diamond_stamp: isDia ? (prev.diamond_stamp || defaultDiaStamp) : prev.diamond_stamp,
        color_stone_stamp: isSt ? (prev.color_stone_stamp || defaultStStamp) : prev.color_stone_stamp,
        item_name: rm.name || prev.item_name,
        touch: (isDia || isSt) ? 100 : (prev.touch || 91.6),
        wastage_percent: (isDia || isSt) ? 0 : (prev.wastage_percent || 0),
      }));
    } else {
      setFormData(prev => ({ ...prev, raw_material_id: '' }));
    }
  };

  const selectedCategoryCode = selectedProduct?.category?.code?.toUpperCase() || '';
  const selectedCategoryName = selectedProduct?.category?.name?.toLowerCase() || '';
  const isDiamond = (
    formData.metal_type?.toLowerCase() === 'diamond' ||
    selectedCategoryCode === 'DIAMOND' ||
    selectedCategoryName.includes('diamond') ||
    selectedRawMaterial?.material_type?.toLowerCase() === 'diamond' ||
    selectedRawMaterial?.name?.toLowerCase().includes('diamond') ||
    formData.unit?.toLowerCase() === 'ct' ||
    selectedRawMaterial?.unit?.toLowerCase() === 'ct'
  );
  const isDiamondProduct = isDiamond;
  const isDiamondRawMaterial = formData.purchase_type === 'raw_material' && isDiamond;

  const isStone = (
    formData.metal_type?.toLowerCase() === 'stone' ||
    formData.metal_type?.toLowerCase() === 'colour_stone' ||
    formData.metal_type?.toLowerCase() === 'color_stone' ||
    selectedCategoryCode === 'STONE' ||
    selectedCategoryName.includes('stone') ||
    selectedCategoryName.includes('ruby') ||
    selectedCategoryName.includes('emerald') ||
    selectedCategoryName.includes('sapphire') ||
    selectedRawMaterial?.material_type?.toLowerCase() === 'stone' ||
    selectedRawMaterial?.name?.toLowerCase().includes('stone') ||
    selectedRawMaterial?.name?.toLowerCase().includes('ruby') ||
    selectedRawMaterial?.name?.toLowerCase().includes('emerald') ||
    selectedRawMaterial?.name?.toLowerCase().includes('sapphire') ||
    selectedRawMaterial?.name?.toLowerCase().includes('gem')
  );
  const isStoneProduct = isStone;
  const isStoneRawMaterial = formData.purchase_type === 'raw_material' && isStone;

  const diamondMasterStamps = React.useMemo(() => {
    if (!stampsList || stampsList.length === 0) return [];
    const dia = stampsList.filter(s => {
      const app = (s?.applicable_for || '').toLowerCase();
      return app.includes('diamond') || app.includes('all');
    });
    return dia.length > 0 ? dia : stampsList.filter(s => {
      const app = (s?.applicable_for || '').toLowerCase();
      return !app.includes('gold') && !app.includes('silver') && !app.includes('stone') && !app.includes('platinum');
    });
  }, [stampsList]);

  const stoneMasterStamps = React.useMemo(() => {
    if (!stampsList || stampsList.length === 0) return [];
    const filtered = stampsList.filter(s => {
      const app = (s?.applicable_for || '').toLowerCase();
      return app.includes('stone') || app.includes('all');
    });
    return filtered.length > 0 ? filtered : stampsList.filter(s => {
      const app = (s?.applicable_for || '').toLowerCase();
      return !app.includes('gold') && !app.includes('silver') && !app.includes('diamond') && !app.includes('platinum');
    });
  }, [stampsList]);

  const goldMasterStamps = React.useMemo(() => {
    if (!stampsList || stampsList.length === 0) return [];
    const gold = stampsList.filter(s => {
      const app = (s?.applicable_for || '').toLowerCase();
      return app.includes('gold') || app.includes('all');
    });
    return gold.length > 0 ? gold : [
      { id: 'def-g1', name: '916', code: '916' },
      { id: 'def-g2', name: '999', code: '999' },
      { id: 'def-g3', name: '750', code: '750' },
      { id: 'def-g4', name: '585', code: '585' },
    ];
  }, [stampsList]);

  const silverMasterStamps = React.useMemo(() => {
    if (!stampsList || stampsList.length === 0) return [];
    const silver = stampsList.filter(s => {
      const app = (s?.applicable_for || '').toLowerCase();
      return app.includes('silver') || app.includes('all');
    });
    return silver.length > 0 ? silver : [
      { id: 'def-s1', name: '925', code: '925' },
      { id: 'def-s2', name: '999', code: '999' },
    ];
  }, [stampsList]);

  const platinumMasterStamps = React.useMemo(() => {
    if (!stampsList || stampsList.length === 0) return [];
    const plat = stampsList.filter(s => {
      const app = (s?.applicable_for || '').toLowerCase();
      return app.includes('platinum') || app.includes('all');
    });
    return plat.length > 0 ? plat : [
      { id: 'def-pt1', name: 'PT950', code: 'PT950' },
      { id: 'def-pt2', name: 'PT900', code: 'PT900' },
      { id: 'def-pt3', name: '950', code: '950' },
    ];
  }, [stampsList]);

  const metalUnits = React.useMemo(() => {
    if (!unitsList || unitsList.length === 0) return [];
    const filtered = unitsList.filter(u => {
      const name = (u?.name || '').toLowerCase();
      const code = (u?.code || '').toLowerCase();
      return ['g', 'gram', 'grams', 'kg', 'kilogram', 'kilograms', 'mg', 'milligram', 'milligrams', 'tola', 'oz', 'ounce'].some(
        w => code === w || name.includes(w)
      );
    });
    return filtered.length > 0 ? filtered : unitsList;
  }, [unitsList]);

  const diamondUnits = React.useMemo(() => {
    if (!unitsList || unitsList.length === 0) return [];
    const filtered = unitsList.filter(u => {
      const name = (u?.name || '').toLowerCase();
      const code = (u?.code || '').toLowerCase();
      return ['ct', 'carat', 'carats', 'pcs', 'piece', 'pieces', 'unit', 'units', 'stone', 'stones'].some(
        w => code === w || name.includes(w)
      );
    });
    return filtered.length > 0 ? filtered : unitsList;
  }, [unitsList]);

  const stoneUnits = React.useMemo(() => {
    if (!unitsList || unitsList.length === 0) return [];
    const filtered = unitsList.filter(u => {
      const name = (u?.name || '').toLowerCase();
      const code = (u?.code || '').toLowerCase();
      return ['ct', 'carat', 'carats', 'g', 'gram', 'grams', 'pcs', 'piece', 'pieces', 'unit', 'units'].some(
        w => code === w || name.includes(w)
      );
    });
    return filtered.length > 0 ? filtered : unitsList;
  }, [unitsList]);

  const addDiamondRow = () => {
    setDiamondRows(prev => [
      ...prev,
      { stamp: diamondMasterStamps[0]?.name || '+5 Sieve', diamond_type: 'Round Brilliant', stones_count: '1', weight_carats: '1.000', rate_per_carat: '', row_value: '', notes: '' }
    ]);
  };

  const updateDiamondRow = (index, field, value) => {
    setDiamondRows(prev => {
      const updated = [...prev];
      const cur = { ...updated[index], [field]: value };

      if (field === 'weight_carats') {
        const cts = parseFloat(value) || 0;
        const rate = parseFloat(cur.rate_per_carat) || 0;
        const val = parseFloat(cur.row_value) || 0;
        if (cts > 0 && rate > 0) {
          cur.row_value = (cts * rate).toFixed(2);
        } else if (cts > 0 && val > 0 && (!rate || rate === 0)) {
          cur.rate_per_carat = (val / cts).toFixed(2);
        } else if (value === '') {
          cur.row_value = '';
        }
      } else if (field === 'rate_per_carat') {
        const rate = parseFloat(value) || 0;
        const cts = parseFloat(cur.weight_carats) || 0;
        if (cts > 0 && rate > 0) {
          cur.row_value = (cts * rate).toFixed(2);
        } else if (value === '') {
          cur.row_value = '';
        }
      } else if (field === 'row_value') {
        const val = parseFloat(value) || 0;
        const cts = parseFloat(cur.weight_carats) || 0;
        if (cts > 0 && val > 0) {
          cur.rate_per_carat = (val / cts).toFixed(2);
        } else if (value === '') {
          cur.rate_per_carat = '';
        }
      }

      updated[index] = cur;
      return updated;
    });
  };

  const removeDiamondRow = (index) => {
    setDiamondRows(prev => prev.filter((_, idx) => idx !== index));
  };

  const totalDiamondCarats = diamondRows.reduce((sum, r) => sum + (parseFloat(r.weight_carats) || 0), 0);
  const totalDiamondPieces = diamondRows.reduce((sum, r) => sum + (parseInt(r.stones_count) || 0), 0);
  const totalDiamondAmount = diamondRows.reduce((sum, r) => sum + (parseFloat(r.row_value) || 0), 0);

  // Colour Stone Rows Handlers
  const addStoneRow = () => {
    setStoneRows(prev => [
      ...prev,
      { stamp: stoneMasterStamps[0]?.name || 'Ruby', stone_type: 'Oval', stones_count: '1', weight_carats: '0.500', rate_per_carat: '', row_value: '', notes: '' }
    ]);
  };

  const updateStoneRow = (index, field, value) => {
    setStoneRows(prev => {
      const updated = [...prev];
      const cur = { ...updated[index], [field]: value };
      if (field === 'weight_carats') {
        const cts = parseFloat(value) || 0;
        const rate = parseFloat(cur.rate_per_carat) || 0;
        const val = parseFloat(cur.row_value) || 0;
        if (cts > 0 && rate > 0) {
          cur.row_value = (cts * rate).toFixed(2);
        } else if (cts > 0 && val > 0 && (!rate || rate === 0)) {
          cur.rate_per_carat = (val / cts).toFixed(2);
        } else if (value === '') {
          cur.row_value = '';
        }
      } else if (field === 'rate_per_carat') {
        const rate = parseFloat(value) || 0;
        const cts = parseFloat(cur.weight_carats) || 0;
        if (cts > 0 && rate > 0) {
          cur.row_value = (cts * rate).toFixed(2);
        } else if (value === '') {
          cur.row_value = '';
        }
      } else if (field === 'row_value') {
        const val = parseFloat(value) || 0;
        const cts = parseFloat(cur.weight_carats) || 0;
        if (cts > 0 && val > 0) {
          cur.rate_per_carat = (val / cts).toFixed(2);
        } else if (value === '') {
          cur.rate_per_carat = '';
        }
      }
      updated[index] = cur;
      return updated;
    });
  };

  const removeStoneRow = (index) => {
    setStoneRows(prev => prev.filter((_, idx) => idx !== index));
  };

  const totalStoneCarats = stoneRows.reduce((sum, r) => sum + (parseFloat(r.weight_carats) || 0), 0);
  const totalStonePieces = stoneRows.reduce((sum, r) => sum + (parseInt(r.stones_count) || 0), 0);
  const totalStoneAmount = stoneRows.reduce((sum, r) => sum + (parseFloat(r.row_value) || 0), 0);

  // Auto-sync less_weight with total diamond and stone carats in Finished Jewellery
  useEffect(() => {
    if (purchaseCategory === 'finished') {
      const compCarats = totalDiamondCarats + totalStoneCarats;
      if (compCarats > 0) {
        setFormData(prev => {
          const newLess = compCarats.toFixed(3);
          const gross = parseFloat(prev.weight) || 0;
          const calculatedNet = Math.max(0, gross - (compCarats * 0.2)).toFixed(3);
          return {
            ...prev,
            less_weight: newLess,
            net_weight: calculatedNet,
          };
        });
      }
    }
  }, [totalDiamondCarats, totalStoneCarats, purchaseCategory]);

  const switchCategory = (cat) => {
    setPurchaseCategory(cat);
    if (cat === 'gold') {
      const goldRm = rawMaterials.find(m => m.material_type?.toLowerCase() === 'gold') || rawMaterials[0];
      setFormData(prev => ({
        ...prev,
        purchase_type: 'raw_material',
        metal_type: 'gold',
        raw_material_id: goldRm ? goldRm.id : prev.raw_material_id,
        unit: 'g',
        gold_karat: '22K',
        purity: '22K (916)',
        touch: '91.667',
        stamp: '',
        weight: '',
        less_weight: '0',
        net_weight: '',
        rate: '',
        making_charge_type: 'total',
        making_charge_rate: '',
        making_charge: '0',
        stone_cost: '0',
      }));
    } else if (cat === 'silver') {
      const silRm = rawMaterials.find(m => m.material_type?.toLowerCase() === 'silver');
      setFormData(prev => ({
        ...prev,
        purchase_type: 'raw_material',
        metal_type: 'silver',
        raw_material_id: silRm ? silRm.id : '',
        unit: 'g',
        purity: '999 Fine Silver',
        touch: '99.9',
        stamp: '',
        weight: '',
        less_weight: '0',
        net_weight: '',
        rate: '',
        making_charge_type: 'total',
        making_charge_rate: '',
        making_charge: '0',
        stone_cost: '0',
      }));
    } else if (cat === 'diamond') {
      const diaRm = rawMaterials.find(m => m.material_type?.toLowerCase() === 'diamond');
      setFormData(prev => ({
        ...prev,
        purchase_type: 'raw_material',
        metal_type: 'diamond',
        raw_material_id: diaRm ? diaRm.id : '',
        unit: 'ct',
        touch: '100',
        purity: 'Standard Diamond',
        rate: '',
        making_charge_type: 'total',
        making_charge_rate: '',
        making_charge: '0',
        stone_cost: '0',
      }));
      if (diamondRows.length === 0) {
        setDiamondRows([
          { stamp: diamondMasterStamps[0]?.name || '+5 Sieve', diamond_type: 'Round Brilliant', stones_count: '1', weight_carats: '1.000', rate_per_carat: '', row_value: '', notes: '' }
        ]);
      }
    } else if (cat === 'finished') {
      setFormData(prev => ({
        ...prev,
        purchase_type: 'finished_product',
        metal_type: 'gold',
        unit: 'g',
        gold_karat: '22K',
        purity: '22K (916)',
        touch: '91.667',
        making_charge_type: 'total',
        making_charge_rate: '',
      }));
      if (diamondRows.length === 0) {
        setDiamondRows([
          { stamp: diamondMasterStamps[0]?.name || '+5 Sieve', diamond_type: 'Round Brilliant', stones_count: '1', weight_carats: '1.000', rate_per_carat: '', row_value: '', notes: '' }
        ]);
      }
      if (stoneRows.length === 0) {
        setStoneRows([
          { stamp: stoneMasterStamps[0]?.name || 'Ruby', stone_type: 'Oval', stones_count: '1', weight_carats: '0.500', rate_per_carat: '', row_value: '', notes: '' }
        ]);
      }
    }
  };

  // Dynamic Weight Math (Stone weight / Less weight is in Carats 'ct', 1 ct = 0.200 g)
  const isCaratMaterial = isDiamondProduct || isStoneProduct || purchaseCategory === 'diamond';
  const grossWtVal = parseFloat(formData.weight) || 0;
  const countQtyVal = parseFloat(formData.count_qty) || 0;
  const lessWtVal = parseFloat(formData.less_weight) || 0;
  // If diamond or stone product, Gross Weight is already in ct; for metal products (g), lessWt in ct is converted to grams (ct * 0.2)
  const lessWtInGrams = isCaratMaterial ? lessWtVal : (lessWtVal * 0.2);
  const computedNetWt = Math.max(0, grossWtVal - lessWtInGrams).toFixed(3);
  const netWtVal = parseFloat(formData.net_weight) > 0 ? parseFloat(formData.net_weight) : parseFloat(computedNetWt);

  const touchVal = isCaratMaterial ? 100 : (parseFloat(formData.touch) || 0);
  const wastageVal = isCaratMaterial ? 0 : (parseFloat(formData.wastage_percent) || 0);
  const effectiveTouchVal = touchVal + wastageVal;

  // 24K Pure Gold Conversion:
  // Calculations based on Touch and Wastage: Effective Purity = Touch + Wastage
  // Example: touch = 92, wastage = 8 -> purity = 100% (or touch 90 + wastage 8 = 98%)
  // Fine Gold Weight = Net Weight * ((Touch + Wastage) / 100)
  let calculatedFineWeight = 0;
  if (isCaratMaterial) {
    calculatedFineWeight = netWtVal > 0 ? netWtVal : grossWtVal;
  } else if (effectiveTouchVal > 0) {
    calculatedFineWeight = netWtVal * (effectiveTouchVal / 100);
  } else {
    const purityStr = String(formData.purity || formData.gold_karat || '').toUpperCase();
    const karatMatch = purityStr.match(/(24|22|20|18|14|10)\s*K/i);
    const karatNum = karatMatch ? parseFloat(karatMatch[1]) : (['24', '22', '20', '18', '14', '10'].includes(purityStr) ? parseFloat(purityStr) : null);
    if (karatNum) {
      calculatedFineWeight = netWtVal * ((karatNum / 24) + (wastageVal / 100));
    } else {
      calculatedFineWeight = netWtVal * (effectiveTouchVal / 100);
    }
  }

  const computedFineWt = parseFloat(formData.fine_weight) > 0
    ? parseFloat(formData.fine_weight).toFixed(3)
    : calculatedFineWeight.toFixed(3);
  const computedFineWtKg = isCaratMaterial ? '-' : (computedFineWt / 1000).toFixed(3);

  const rateVal = parseFloat(formData.rate) || 0;
  const qtyVal = parseInt(formData.qty) || 1;
  const stoneCostVal = parseFloat(formData.stone_cost) || 0;

  // Making charges calculation honoring selection mode: 'per_gram' | 'per_ct' | 'total'
  const mcType = formData.making_charge_type || 'total';
  const mcRate = parseFloat(formData.making_charge_rate) || 0;
  let effectiveMakingCharge = 0;
  if (mcType === 'per_gram') {
    effectiveMakingCharge = netWtVal > 0 && mcRate > 0 ? Math.round(netWtVal * mcRate * 100) / 100 : 0;
  } else if (mcType === 'per_ct') {
    const diaCts = totalDiamondCarats > 0 ? totalDiamondCarats : (parseFloat(formData.weight) || 0);
    effectiveMakingCharge = diaCts > 0 && mcRate > 0 ? Math.round(diaCts * mcRate * 100) / 100 : 0;
  } else {
    effectiveMakingCharge = parseFloat(formData.making_charge) || 0;
  }

  // Base material cost:
  // For Diamond: sum of all diamond rows (totalDiamondAmount)
  // For Finished Jewellery: base gold (netWt * rate) + totalDiamondAmount + totalStoneAmount
  // For Gold / Silver / Raw Metal: netWt * rate (or qty * rate)
  let effectiveBaseCost = 0;
  if (purchaseCategory === 'diamond') {
    effectiveBaseCost = totalDiamondAmount;
  } else if (purchaseCategory === 'finished') {
    effectiveBaseCost = (netWtVal > 0 && rateVal > 0 ? (netWtVal * rateVal) : 0) + totalDiamondAmount + totalStoneAmount;
  } else {
    effectiveBaseCost = netWtVal > 0 && rateVal > 0
      ? (netWtVal * rateVal)
      : (qtyVal > 0 && rateVal > 0 ? (qtyVal * rateVal) : 0);
  }

  const subtotalCost = effectiveBaseCost + effectiveMakingCharge + stoneCostVal;

  // Optional GST Calculations
  const cgstPercentVal = parseFloat(formData.cgst_percent) || 0;
  const cgstAmountVal = parseFloat(formData.cgst_amount) || (cgstPercentVal > 0 ? Math.round((subtotalCost * cgstPercentVal / 100) * 100) / 100 : 0);

  const sgstPercentVal = parseFloat(formData.sgst_percent) || 0;
  const sgstAmountVal = parseFloat(formData.sgst_amount) || (sgstPercentVal > 0 ? Math.round((subtotalCost * sgstPercentVal / 100) * 100) / 100 : 0);

  const igstPercentVal = parseFloat(formData.igst_percent) || 0;
  const igstAmountVal = parseFloat(formData.igst_amount) || (igstPercentVal > 0 ? Math.round((subtotalCost * igstPercentVal / 100) * 100) / 100 : 0);

  const computedTaxTotal = cgstAmountVal + sgstAmountVal + igstAmountVal;
  const computedTotal = (subtotalCost + computedTaxTotal).toFixed(2);

  // Helper to keep weight changes synchronized with labour / making charges strictly on Net Weight
  const updateWeightsAndLabor = (grossStr, lessStr, netOverride = null) => {
    const gross = parseFloat(grossStr) || 0;
    const less = parseFloat(lessStr) || 0;
    const lessInGrams = isCaratMaterial ? less : (less * 0.2);
    const newNet = netOverride !== null ? netOverride : Math.max(0, gross - lessInGrams).toFixed(3);
    const newNetNum = parseFloat(newNet) || 0;

    let updatedMc = formData.making_charge;
    if (formData.making_charge_rate && parseFloat(formData.making_charge_rate) > 0) {
      updatedMc = (newNetNum * parseFloat(formData.making_charge_rate)).toFixed(2);
    }

    setFormData(prev => ({
      ...prev,
      weight: grossStr,
      less_weight: lessStr,
      net_weight: newNet,
      making_charge: updatedMc,
    }));
  };

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
      const attrs = (typeof prod.attributes === 'object' && prod.attributes !== null) ? prod.attributes : {};
      setFormData(prev => ({
        ...prev,
        product_id: prodId,
        category_id: prod.category_id || prev.category_id,
        subcategory_id: prod.subcategory_id || prev.subcategory_id || '',
        item_name: prod.name,
        product_code: prod.product_code,
        design_no: prod.design_no || attrs.design_no || prod.product_code || prev.design_no,
        gold_karat: attrs.karat || attrs.gold_karat || prev.gold_karat || '22K',
        gold_stamp: attrs.stamp || attrs.gold_stamp || prev.gold_stamp || '916',
        setting_type: attrs.setting_style || attrs.setting_type || prev.setting_type || 'Prong',
        diamond_weight: attrs.dia_wt_ct ?? attrs.diamond_weight ?? attrs.diamond_wt ?? prev.diamond_weight,
        diamond_count: attrs.diamond_count ?? attrs.no_of_diamonds ?? prev.diamond_count,
        diamond_stamp: attrs.diamond_stamp || prev.diamond_stamp,
        diamond_clarity: attrs.diamond_clarity || prev.diamond_clarity,
        diamond_color: attrs.diamond_color || prev.diamond_color,
        color_stone_weight: attrs.stone_weight ?? attrs.color_stone_weight ?? prev.color_stone_weight,
        color_stone_count: attrs.stone_count ?? attrs.color_stone_count ?? prev.color_stone_count,
        color_stone_stamp: attrs.color_stone_stamp || prev.color_stone_stamp,
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

  const handleCategoryChange = (e) => {
    const catId = e.target.value;
    setFormData(prev => ({
      ...prev,
      category_id: catId,
      subcategory_id: '',
    }));
  };

  const availableSubcategories = React.useMemo(() => {
    if (!formData.category_id) return allSubcategories;
    return allSubcategories.filter(s => String(s.category_id) === String(formData.category_id));
  }, [allSubcategories, formData.category_id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'metal_type') {
      const isDia = value === 'diamond';
      const isSil = value === 'silver';
      let defPurity = '24K (999)';
      let defUnit = 'g';
      if (isDia) {
        const diaStamps = stampsList.filter(s => !s.applicable_for || s.applicable_for.toLowerCase().includes('diamond') || s.applicable_for.toLowerCase().includes('all'));
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
    if (name === 'credit_days') {
      const days = parseInt(value) || 0;
      let newDueDate = formData.due_date;
      if (days > 0 && formData.purchase_date) {
        const d = new Date(formData.purchase_date);
        d.setDate(d.getDate() + days);
        newDueDate = d.toISOString().split('T')[0];
      }
      setFormData(prev => ({ ...prev, credit_days: value, due_date: newDueDate }));
      return;
    }
    if (name === 'payment_status') {
      const tot = parseFloat(formData.total_amount !== '' && formData.total_amount !== undefined ? formData.total_amount : computedTotal) || 0;
      let newPaid = formData.paid_amount;
      if (value === 'paid') {
        newPaid = tot > 0 ? tot.toFixed(2) : '';
      } else if (value === 'unpaid') {
        newPaid = '0';
      } else if (value === 'partial') {
        if (parseFloat(newPaid) >= tot || parseFloat(newPaid) <= 0 || !newPaid) {
          newPaid = '';
        }
      }
      setFormData(prev => ({ ...prev, payment_status: value, paid_amount: newPaid }));
      return;
    }
    if (name === 'paid_amount') {
      const sanitized = normalizeNumericInput(value, formData.paid_amount);
      const paidVal = parseFloat(sanitized) || 0;
      const tot = parseFloat(formData.total_amount !== '' && formData.total_amount !== undefined ? formData.total_amount : computedTotal) || 0;
      let newStatus = formData.payment_status;
      if (paidVal >= tot && tot > 0) {
        newStatus = 'paid';
      } else if (paidVal > 0) {
        newStatus = 'partial';
      } else {
        newStatus = 'unpaid';
      }
      setFormData(prev => ({ ...prev, paid_amount: sanitized, payment_status: newStatus }));
      return;
    }
    const numericFields = [
      'qty', 'weight', 'count_qty', 'less_weight', 'net_weight', 'touch', 'wastage_percent',
      'rate', 'making_charge', 'stone_weight', 'stone_cost',
      'cgst_percent', 'cgst_amount', 'sgst_percent', 'sgst_amount', 'igst_percent', 'igst_amount',
      'credit_days', 'paid_amount', 'total_amount',
      'diamond_weight', 'diamond_count', 'color_stone_weight', 'color_stone_count'
    ];
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

    if (purchaseCategory === 'diamond') {
      if (!diamondRows || diamondRows.length === 0) {
        showToast('Please add at least one Diamond row', 'error', 'Validation Error');
        return;
      }
      const invalidRow = diamondRows.find(r => !r.stamp || !(parseFloat(r.weight_carats) > 0));
      if (invalidRow) {
        showToast('Each diamond row must specify a Stamp / Sieve and Carat Weight > 0', 'error', 'Validation Error');
        return;
      }
    } else if (purchaseCategory === 'finished') {
      if (jewelMode === 'existing' && !formData.product_id) {
        showToast('Please select an existing Product from catalog', 'error', 'Validation Error');
        return;
      }
      if (jewelMode === 'new_item' && !formData.item_name) {
        showToast('Please enter the Jewellery Item Name', 'error', 'Validation Error');
        return;
      }
      if (!formData.weight || parseFloat(formData.weight) <= 0) {
        showToast('Gross Weight is required and must be greater than 0', 'error', 'Validation Error');
        return;
      }
    } else {
      // Gold or Silver
      if (!formData.weight || parseFloat(formData.weight) <= 0) {
        showToast('Gross Weight is required and must be greater than 0', 'error', 'Validation Error');
        return;
      }
    }

    if (formData.payment_status === 'partial') {
      const paidVal = parseFloat(formData.paid_amount) || 0;
      const tot = (formData.total_amount !== '' && formData.total_amount !== undefined && !isNaN(parseFloat(formData.total_amount)))
        ? parseFloat(formData.total_amount)
        : parseFloat(computedTotal);
      if (paidVal <= 0) {
        showToast('Please enter the partial amount paid in the "Amount Paid (₹)" field (must be greater than ₹0).', 'error', 'Validation Error');
        return;
      }
      if (tot > 0 && paidVal >= tot) {
        showToast('Partial paid amount cannot equal or exceed total bill. Select "Fully Paid" instead.', 'error', 'Validation Error');
        return;
      }
    }

    setSaving(true);
    try {
      let payload;
      const isNewProduct = purchaseCategory === 'finished' && jewelMode === 'new_item';

      const sanitizedStoneWeight = parseFloat(formData.stone_weight) || 0;
      const sanitizedLessWeight = parseFloat(formData.less_weight) || 0;
      const sanitizedMakingCharge = parseFloat(formData.making_charge) || 0;
      const sanitizedStoneCost = parseFloat(formData.stone_cost) || 0;

      const effectiveGrossWeight = purchaseCategory === 'diamond'
        ? totalDiamondCarats
        : (parseFloat(formData.weight) || 0);

      const effectiveNetWeight = purchaseCategory === 'diamond'
        ? totalDiamondCarats
        : (parseFloat(formData.net_weight) > 0 ? parseFloat(formData.net_weight) : parseFloat(computedNetWt));

      const effectiveFineWeight = purchaseCategory === 'diamond'
        ? totalDiamondCarats
        : (purchaseCategory === 'silver' ? effectiveNetWeight : parseFloat(computedFineWt));

      const effectiveCountQty = purchaseCategory === 'diamond'
        ? totalDiamondPieces
        : (parseFloat(formData.count_qty) || parseFloat(formData.qty) || 1);

      const effectiveTotalAmount = (formData.total_amount !== '' && formData.total_amount !== undefined && !isNaN(parseFloat(formData.total_amount)))
        ? parseFloat(formData.total_amount)
        : parseFloat(computedTotal);

      const effectiveRate = purchaseCategory === 'diamond'
        ? (totalDiamondCarats > 0 && totalDiamondAmount > 0 ? (totalDiamondAmount / totalDiamondCarats).toFixed(2) : (parseFloat(formData.rate) || 0))
        : (parseFloat(formData.rate) || 0);

      const uniqueDiamondStamps = Array.from(new Set(diamondRows.map(r => r.stamp?.trim()).filter(Boolean)));
      const uniqueStoneStamps = Array.from(new Set(stoneRows.map(r => r.stamp?.trim()).filter(Boolean)));
      const effectiveStamp = purchaseCategory === 'diamond'
        ? (uniqueDiamondStamps.length === 1 ? uniqueDiamondStamps[0] : (uniqueDiamondStamps.join(', ') || 'Multi-Stamp'))
        : (formData.stamp || null);

      const componentsData = purchaseCategory === 'diamond'
        ? diamondRows
        : (purchaseCategory === 'finished'
          ? [
            ...diamondRows.filter(r => (parseFloat(r.weight_carats) > 0 || parseInt(r.stones_count) > 0 || r.stamp)).map(r => ({ ...r, category_name: 'Diamond' })),
            ...stoneRows.filter(r => (parseFloat(r.weight_carats) > 0 || parseInt(r.stones_count) > 0 || r.stamp)).map(r => ({ ...r, category_name: 'Color Stone' }))
          ]
          : null);

      if (imageFile) {
        payload = new FormData();
        Object.keys(formData).forEach(key => {
          if (formData[key] !== null && formData[key] !== undefined && key !== 'components') {
            payload.append(key, formData[key]);
          }
        });
        payload.append('purchase_type', purchaseCategory === 'finished' ? 'finished_product' : 'raw_material');
        payload.append('metal_type', purchaseCategory === 'silver' ? 'silver' : purchaseCategory === 'diamond' ? 'diamond' : 'gold');
        payload.append('is_new_product', isNewProduct ? '1' : '0');
        payload.append('weight', String(effectiveGrossWeight));
        payload.append('net_weight', String(effectiveNetWeight));
        payload.append('fine_weight', String(effectiveFineWeight));
        payload.append('count_qty', String(effectiveCountQty));
        payload.append('rate', String(effectiveRate));
        payload.append('total_amount', String(effectiveTotalAmount));
        payload.append('stamp', effectiveStamp || '');
        payload.append('unit', purchaseCategory === 'diamond' ? 'ct' : 'g');
        payload.append('image', imageFile);
        if (componentsData) {
          payload.append('components', JSON.stringify(componentsData));
        }
        payload.append('stone_weight', String(sanitizedStoneWeight));
        payload.append('less_weight', String(sanitizedLessWeight));
        payload.append('making_charge', String(effectiveMakingCharge));
        payload.append('making_charge_type', formData.making_charge_type || 'total');
        payload.append('making_charge_rate', String(formData.making_charge_rate || 0));
        payload.append('diamond_weight', String(totalDiamondCarats));
        payload.append('diamond_count', String(totalDiamondPieces));
        payload.append('diamond_stamp', uniqueDiamondStamps.join(', '));
        payload.append('color_stone_weight', String(totalStoneCarats));
        payload.append('color_stone_count', String(totalStonePieces));
        payload.append('color_stone_stamp', uniqueStoneStamps.join(', '));
        payload.append('stone_cost', String(sanitizedStoneCost));
        payload.append('wastage_percent', String(formData.wastage_percent || 0));
        payload.append('cgst_percent', String(formData.cgst_percent || 0));
        payload.append('cgst_amount', String(cgstAmountVal));
        payload.append('sgst_percent', String(formData.sgst_percent || 0));
        payload.append('sgst_amount', String(sgstAmountVal));
        payload.append('igst_percent', String(formData.igst_percent || 0));
        payload.append('igst_amount', String(igstAmountVal));
        payload.append('total_tax_amount', String(computedTaxTotal));
        payload.append('credit_days', String(formData.credit_days || 0));
        payload.append('due_date', formData.due_date || '');
        payload.append('payment_status', formData.payment_status || 'unpaid');
        payload.append('paid_amount', String(formData.paid_amount || 0));
      } else {
        payload = {
          ...formData,
          purchase_type: purchaseCategory === 'finished' ? 'finished_product' : 'raw_material',
          metal_type: purchaseCategory === 'silver' ? 'silver' : purchaseCategory === 'diamond' ? 'diamond' : 'gold',
          stamp: effectiveStamp,
          is_new_product: isNewProduct,
          raw_material_id: formData.raw_material_id || null,
          weight: effectiveGrossWeight,
          net_weight: effectiveNetWeight,
          fine_weight: effectiveFineWeight,
          count_qty: effectiveCountQty,
          unit: purchaseCategory === 'diamond' ? 'ct' : 'g',
          rate: effectiveRate,
          total_amount: effectiveTotalAmount,
          components: componentsData,
          stone_weight: sanitizedStoneWeight,
          less_weight: sanitizedLessWeight,
          making_charge: effectiveMakingCharge,
          making_charge_type: formData.making_charge_type || 'total',
          making_charge_rate: parseFloat(formData.making_charge_rate) || 0,
          diamond_weight: totalDiamondCarats,
          diamond_count: totalDiamondPieces,
          diamond_stamp: uniqueDiamondStamps.join(', '),
          color_stone_weight: totalStoneCarats,
          color_stone_count: totalStonePieces,
          color_stone_stamp: uniqueStoneStamps.join(', '),
          stone_cost: sanitizedStoneCost,
          wastage_percent: parseFloat(formData.wastage_percent) || 0,
          cgst_percent: parseFloat(formData.cgst_percent) || 0,
          cgst_amount: cgstAmountVal,
          sgst_percent: parseFloat(formData.sgst_percent) || 0,
          sgst_amount: sgstAmountVal,
          igst_percent: parseFloat(formData.igst_percent) || 0,
          igst_amount: igstAmountVal,
          total_tax_amount: computedTaxTotal,
          credit_days: parseInt(formData.credit_days) || 0,
          due_date: formData.due_date || null,
          payment_status: formData.payment_status || 'unpaid',
          paid_amount: parseFloat(formData.paid_amount) || 0
        };
      }

      const res = await api.post('/purchase-entries', payload);
      showToast(res.data?.message || 'Purchase entry recorded & stock updated successfully!', 'success');

      // Dispatch global events for live inventory sync across pages
      window.dispatchEvent(new CustomEvent('rudhra_inventory_updated'));
      window.dispatchEvent(new CustomEvent('rudhra_purchase_updated'));
      window.dispatchEvent(new CustomEvent('rudhra_stamps_updated', { detail: { stamp: formData.stamp } }));

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
      let updated = { ...prev, [name]: value };

      // 1. DYNAMIC LINKING: Stamp Master selection -> Karat & Purity
      if (name === 'stamp' && updated.material_type === 'gold') {
        const stampStr = String(value || '').trim();
        let targetKarat = '';
        let targetPurity = '';

        if (stampStr.includes('999') || stampStr.includes('24')) {
          targetKarat = '24K';
          targetPurity = '99.9';
        } else if (stampStr.includes('916') || stampStr.includes('22')) {
          targetKarat = '22K';
          targetPurity = '91.6';
        } else if (stampStr.includes('875') || stampStr.includes('21')) {
          targetKarat = '21K';
          targetPurity = '87.5';
        } else if (stampStr.includes('750') || stampStr.includes('18')) {
          targetKarat = '18K';
          targetPurity = '75.0';
        } else if (stampStr.includes('585') || stampStr.includes('14')) {
          targetKarat = '14K';
          targetPurity = '58.5';
        } else if (stampStr.includes('417') || stampStr.includes('10')) {
          targetKarat = '10K';
          targetPurity = '41.7';
        } else if (stampStr.includes('375') || stampStr.includes('9')) {
          targetKarat = '9K';
          targetPurity = '37.5';
        } else {
          const numMatch = stampStr.match(/\d{3}/);
          if (numMatch) {
            const num = parseInt(numMatch[0], 10);
            targetPurity = (num / 10).toFixed(1);
            const approxKarat = Math.round((num / 1000) * 24);
            targetKarat = `${approxKarat}K`;
          }
        }

        if (targetKarat) {
          const matchKarat = karatsList.find(k =>
            k.name?.toLowerCase() === targetKarat.toLowerCase() ||
            k.code?.toLowerCase() === targetKarat.toLowerCase() ||
            k.name?.replace(/\D/g, '') === targetKarat.replace(/\D/g, '')
          );
          if (matchKarat) {
            updated.karat = matchKarat.name;
          } else {
            updated.karat = targetKarat;
          }
        }
        if (targetPurity) {
          updated.purity = targetPurity;
        }
      }

      // 2. DYNAMIC LINKING: Stamp Master selection for Silver
      if (name === 'stamp' && updated.material_type === 'silver') {
        const stampStr = String(value || '').trim();
        if (stampStr.includes('925') || stampStr.includes('999') || stampStr.includes('990')) {
          const numMatch = stampStr.match(/\d{3}/);
          updated.purity = numMatch ? (parseInt(numMatch[0], 10) / 10).toFixed(1) : '92.5';
        }
      }

      // 3. DYNAMIC LINKING: Stamp Master selection for Platinum
      if (name === 'stamp' && updated.material_type === 'platinum') {
        const stampStr = String(value || '').trim();
        if (stampStr.includes('950')) {
          updated.purity = '95.0';
        } else if (stampStr.includes('900')) {
          updated.purity = '90.0';
        }
      }

      // 4. DYNAMIC LINKING: Karat Master selection -> Stamp Master & Purity
      if (name === 'karat' && updated.material_type === 'gold') {
        const karatStr = String(value || '').trim();
        const kNum = parseInt(karatStr.replace(/\D/g, ''), 10);

        let targetStampCode = '';
        let targetPurity = '';

        if (kNum === 24) {
          targetStampCode = '999';
          targetPurity = '99.9';
        } else if (kNum === 22) {
          targetStampCode = '916';
          targetPurity = '91.6';
        } else if (kNum === 21) {
          targetStampCode = '875';
          targetPurity = '87.5';
        } else if (kNum === 18) {
          targetStampCode = '750';
          targetPurity = '75.0';
        } else if (kNum === 14) {
          targetStampCode = '585';
          targetPurity = '58.5';
        } else if (kNum === 10) {
          targetStampCode = '417';
          targetPurity = '41.7';
        } else if (kNum === 9) {
          targetStampCode = '375';
          targetPurity = '37.5';
        } else if (kNum > 0) {
          targetPurity = ((kNum / 24) * 100).toFixed(1);
        }

        if (targetStampCode) {
          const goldStamps = stampsList.filter(s => {
            const app = (s?.applicable_for || '').toLowerCase();
            return !app || app.includes('gold') || app.includes('all');
          });
          const matchStamp = goldStamps.find(s =>
            s.name?.includes(targetStampCode) ||
            s.code?.includes(targetStampCode) ||
            s.name?.toLowerCase().includes(karatStr.toLowerCase())
          );
          if (matchStamp) {
            updated.stamp = matchStamp.name;
          }
        }
        if (targetPurity) {
          updated.purity = targetPurity;
        }
      }

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
    const matStamps = stampsList.filter(s => {
      if (!s.applicable_for) return true;
      const af = s.applicable_for.toLowerCase();
      return af.includes(matType) || af.includes('all');
    });

    let defaultUnit = '';
    if (matType === 'diamond') {
      const matchU = unitsList.find(u => u.code?.toLowerCase() === 'ct' || u.name?.toLowerCase().includes('carat'));
      defaultUnit = matchU?.code || matchU?.name || unitsList[0]?.code || 'ct';
    } else if (matType === 'stone') {
      const matchU = unitsList.find(u => u.code?.toLowerCase() === 'ct' || u.code?.toLowerCase() === 'pcs' || u.name?.toLowerCase().includes('carat'));
      defaultUnit = matchU?.code || matchU?.name || unitsList[0]?.code || 'ct';
    } else {
      const matchU = unitsList.find(u => u.code?.toLowerCase() === 'g' || u.name?.toLowerCase().includes('gram'));
      defaultUnit = matchU?.code || matchU?.name || unitsList[0]?.code || 'g';
    }

    let defaultKarat = '';
    let defaultStamp = '';
    let defaultPurity = '';

    if (matType === 'gold') {
      const k22 = karatsList.find(k => k.name?.includes('22') || k.code?.includes('22')) || karatsList[0];
      defaultKarat = k22 ? k22.name : '';
      const s916 = matStamps.find(s => s.name?.includes('916') || s.code?.includes('916')) || matStamps[0];
      defaultStamp = s916 ? s916.name : '';
      defaultPurity = '91.6';
    } else if (matType === 'silver') {
      const s925 = matStamps.find(s => s.name?.includes('925') || s.code?.includes('925')) || matStamps[0];
      defaultStamp = s925 ? s925.name : '';
      defaultPurity = '92.5';
    } else if (matType === 'platinum') {
      const s950 = matStamps.find(s => s.name?.includes('950') || s.code?.includes('950')) || matStamps[0];
      defaultStamp = s950 ? s950.name : '';
      defaultPurity = '95.0';
    } else if (matType === 'diamond' || matType === 'stone') {
      defaultStamp = matStamps.length > 0 ? matStamps[0].name : '';
    }

    setOpeningForm(prev => ({
      ...prev,
      material_type: matType,
      unit: defaultUnit,
      karat: defaultKarat,
      purity: defaultPurity,
      stamp: defaultStamp,
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
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'new'
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
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'opening'
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
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'stock'
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
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'details'
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

          {/* 1. PURCHASE CATEGORY SELECTION (4 SEPARATE FORMS) */}
          <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-2">
                <i className="fa-solid fa-layer-group text-[#b01622]"></i>
                Select Purchase Category:
              </span>
              <span className="text-[11px] text-stone-500 font-medium hidden sm:inline">
                Category-specific forms with automated vault routing &amp; supplier ledger balances
              </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 1. Gold Purchase */}
              <button
                type="button"
                onClick={() => switchCategory('gold')}
                className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer flex items-center gap-3 ${purchaseCategory === 'gold'
                  ? 'border-amber-500 bg-amber-50/90 shadow-sm ring-2 ring-amber-200'
                  : 'border-stone-200 bg-white hover:border-amber-300 hover:bg-stone-50'
                  }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${purchaseCategory === 'gold' ? 'bg-amber-500 text-white shadow-sm' : 'bg-amber-100 text-amber-700'
                  }`}>
                  <i className="fa-solid fa-coins"></i>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900">1. Gold Purchase</h4>
                  <p className="text-[10px] text-stone-500 font-medium">24K Pure Eq. &bull; Gold Ledger</p>
                </div>
              </button>

              {/* 2. Silver Purchase */}
              <button
                type="button"
                onClick={() => switchCategory('silver')}
                className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer flex items-center gap-3 ${purchaseCategory === 'silver'
                  ? 'border-slate-500 bg-slate-50 shadow-sm ring-2 ring-slate-200'
                  : 'border-stone-200 bg-white hover:border-slate-300 hover:bg-stone-50'
                  }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${purchaseCategory === 'silver' ? 'bg-slate-700 text-white shadow-sm' : 'bg-slate-200 text-slate-700'
                  }`}>
                  <i className="fa-solid fa-ring"></i>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900">2. Silver Purchase</h4>
                  <p className="text-[10px] text-stone-500 font-medium">Silver Stock &bull; Silver Ledger</p>
                </div>
              </button>

              {/* 3. Diamond Purchase */}
              <button
                type="button"
                onClick={() => switchCategory('diamond')}
                className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer flex items-center gap-3 ${purchaseCategory === 'diamond'
                  ? 'border-cyan-500 bg-cyan-50/90 shadow-sm ring-2 ring-cyan-200'
                  : 'border-stone-200 bg-white hover:border-cyan-300 hover:bg-stone-50'
                  }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${purchaseCategory === 'diamond' ? 'bg-cyan-600 text-white shadow-sm' : 'bg-cyan-100 text-cyan-700'
                  }`}>
                  <i className="fa-solid fa-gem"></i>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900">3. Diamond Purchase</h4>
                  <p className="text-[10px] text-stone-500 font-medium">Multi-Stamp Parcels &bull; Carats</p>
                </div>
              </button>

              {/* 4. Finished Jewellery Purchase */}
              <button
                type="button"
                onClick={() => switchCategory('finished')}
                className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer flex items-center gap-3 ${purchaseCategory === 'finished'
                  ? 'border-purple-500 bg-purple-50/90 shadow-sm ring-2 ring-purple-200'
                  : 'border-stone-200 bg-white hover:border-purple-300 hover:bg-stone-50'
                  }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${purchaseCategory === 'finished' ? 'bg-purple-600 text-white shadow-sm' : 'bg-purple-100 text-purple-700'
                  }`}>
                  <i className="fa-solid fa-crown"></i>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900">4. Finished Jewellery</h4>
                  <p className="text-[10px] text-stone-500 font-medium">Catalog SKU &bull; Multi-Material</p>
                </div>
              </button>
            </div>
          </div>

          {/* 2. SUPPLIER & PHOTO HEADER */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-stone-50/60 p-4 rounded-xl border border-stone-200">
            {/* Supplier Selection */}
            <div className="md:col-span-2">
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
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors"
              >
                <option value="">-- Select Supplier --</option>
                {suppliers.map(sup => (
                  <option key={sup.id} value={sup.id}>
                    {sup.name} {sup.supplier_code ? `(${sup.supplier_code})` : ''} {sup.company_name ? `- ${sup.company_name}` : ''}
                  </option>
                ))}
              </select>

              {selectedSupplier && (
                <div className="mt-2 text-xs bg-white p-2.5 rounded-lg border border-gray-200 flex flex-wrap items-center justify-between gap-2 text-gray-600">
                  <span>Category: <strong className="text-gray-800 uppercase">{selectedSupplier.supplier_type}</strong></span>
                  <span>GSTIN: <strong className="font-mono text-gray-800">{selectedSupplier.gstin || 'N/A'}</strong></span>
                  <span>City: <strong className="text-gray-800">{selectedSupplier.city || 'N/A'}</strong></span>
                  <span>Gold Bal: <strong className="font-mono text-amber-700">{parseFloat(selectedSupplier.gold_balance_grams || 0).toFixed(3)}g</strong></span>
                  <span>Silver Bal: <strong className="font-mono text-slate-700">{parseFloat(selectedSupplier.silver_balance_grams || 0).toFixed(3)}g</strong></span>
                  <span>Cash Bal: <strong className="font-mono text-emerald-700">₹{parseFloat(selectedSupplier.current_balance || 0).toFixed(2)}</strong></span>
                </div>
              )}
            </div>

            {/* Photo / Invoice Upload */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <i className="fa-solid fa-camera text-[#b01622]"></i>
                  Item / Invoice Photo
                </label>
                {imagePreview && (
                  <button
                    type="button"
                    onClick={() => { setImagePreview(''); setImageFile(null); setFormData(prev => ({ ...prev, image: '' })); }}
                    className="text-[10px] text-red-600 font-semibold hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-gray-200">
                {imagePreview ? (
                  <img src={imagePreview} alt="Item" className="w-12 h-12 rounded-lg object-cover border border-gray-300" />
                ) : (
                  <div className="w-12 h-12 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400">
                    <i className="fa-solid fa-image text-base"></i>
                  </div>
                )}
                <label className="flex-1 px-3 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-[#b01622] text-xs font-bold rounded-lg cursor-pointer transition-all text-center">
                  <span>{imagePreview ? 'Change Photo' : 'Upload Photo'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageFileChange} />
                </label>
              </div>
            </div>
          </div>

          {/* 3. CATEGORY SUB-FORM: 1. GOLD PURCHASE */}
          {purchaseCategory === 'gold' && (
            <div className="p-5 bg-gradient-to-br from-amber-50/50 via-white to-amber-50/20 border-2 border-amber-200 rounded-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-amber-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center text-xs shadow-xs">
                    <i className="fa-solid fa-coins"></i>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider">Gold Purchase Details</h3>
                    <p className="text-[11px] text-amber-800">Vault raw gold inventory &bull; 24K pure gold conversion &bull; Zero stone/diamond fields</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-3 py-1 rounded-full">
                  Settlement: {rateVal > 0 ? 'Monetary Cash Payable' : '24K Pure Gold Payable'}
                </span>
              </div>

              <div className="space-y-4">
                {/* Row 1: Karat, Touch, Wastage, Effective Purity */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Gold Karat - Linked to Karat Master */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                      <span>Gold Karat <span className="text-red-500">*</span></span>
                      <Link to="/masters/karats" className="text-[10px] text-[#b01622] hover:underline font-bold">
                        + Karat Master
                      </Link>
                    </label>
                    <select
                      name="gold_karat"
                      value={formData.gold_karat || (karatsList[0]?.name || '22K')}
                      onChange={(e) => {
                        const k = e.target.value;
                        let defaultTouch = '91.667';
                        let purityName = k;
                        const karatNumMatch = k.match(/(\d+)\s*K/i);
                        if (karatNumMatch) {
                          const num = parseFloat(karatNumMatch[1]);
                          defaultTouch = ((num / 24) * 100).toFixed(3);
                          purityName = `${k} (${Math.round((num / 24) * 1000)})`;
                        } else if (k.includes('24') || k.includes('999')) {
                          defaultTouch = '100.000';
                          purityName = '24K (999)';
                        } else if (k.includes('22') || k.includes('916')) {
                          defaultTouch = '91.667';
                          purityName = '22K (916)';
                        } else if (k.includes('18') || k.includes('750')) {
                          defaultTouch = '75.000';
                          purityName = '18K (750)';
                        } else if (k.includes('14') || k.includes('585')) {
                          defaultTouch = '58.333';
                          purityName = '14K (585)';
                        } else if (k.includes('10') || k.includes('417')) {
                          defaultTouch = '41.667';
                          purityName = '10K (417)';
                        }
                        setFormData(prev => ({
                          ...prev,
                          gold_karat: k,
                          touch: defaultTouch,
                          purity: purityName,
                        }));
                      }}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    >
                      <option value="">-- Select Karat from Master --</option>
                      {karatsList.map(k => (
                        <option key={k.id} value={k.name}>
                          {formatKaratLabel(k)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Touch (%) */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Touch (%) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max="100"
                      inputMode="decimal"
                      name="touch"
                      value={formData.touch}
                      onChange={(e) => setFormData(prev => ({ ...prev, touch: sanitizeDecimal(e.target.value, false, 3, null, null, prev.touch) }))}
                      placeholder="91.667"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    />
                  </div>

                  {/* Wastage (%) */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                      <span>Wastage (%)</span>
                      <span className="text-[10px] text-stone-500 font-normal">Adds to Touch</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max="100"
                      inputMode="decimal"
                      name="wastage_percent"
                      value={formData.wastage_percent}
                      onChange={(e) => setFormData(prev => ({ ...prev, wastage_percent: sanitizeDecimal(e.target.value, false, 3, null, null, prev.wastage_percent) }))}
                      placeholder="e.g. 8.000"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-amber-700 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    />
                  </div>

                  {/* Computed Effective Purity (%) */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Effective Purity (%)
                    </label>
                    <div className="w-full px-3 py-2 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 font-mono flex items-center justify-between">
                      <span>{effectiveTouchVal.toFixed(2)}%</span>
                      <span className="text-[10px] text-emerald-700 font-normal">
                        ({touchVal.toFixed(1)}% Touch + {wastageVal.toFixed(1)}% Wastage)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Row 2: Weights & Making Charges (MC placed right near Net Wt) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Gross Weight (g) */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Gross Weight (g) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      inputMode="decimal"
                      name="weight"
                      value={formData.weight}
                      onChange={(e) => {
                        const newGross = sanitizeDecimal(e.target.value, false, 3, null, null, formData.weight);
                        const less = parseFloat(formData.less_weight) || 0;
                        const calculatedNet = Math.max(0, (parseFloat(newGross) || 0) - less).toFixed(3);
                        setFormData(prev => ({
                          ...prev,
                          weight: newGross,
                          net_weight: calculatedNet
                        }));
                      }}
                      required
                      placeholder="0.000"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-amber-800 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    />
                  </div>

                  {/* Deductions / Less Weight (g) */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Less Wt / Deductions (g)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      inputMode="decimal"
                      name="less_weight"
                      value={formData.less_weight}
                      onChange={(e) => {
                        const newLess = sanitizeDecimal(e.target.value, false, 3, null, null, formData.less_weight);
                        const gross = parseFloat(formData.weight) || 0;
                        const calculatedNet = Math.max(0, gross - (parseFloat(newLess) || 0)).toFixed(3);
                        setFormData(prev => ({
                          ...prev,
                          less_weight: newLess,
                          net_weight: calculatedNet
                        }));
                      }}
                      placeholder="0.000"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    />
                  </div>

                  {/* Explicit Net Gold Weight (g) */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                      <span>Net Gold Weight (g) <span className="text-red-500">*</span></span>
                      <span className="text-[10px] text-stone-500 font-normal">Editable</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      inputMode="decimal"
                      name="net_weight"
                      value={formData.net_weight !== '' ? formData.net_weight : computedNetWt}
                      onChange={(e) => setFormData(prev => ({ ...prev, net_weight: sanitizeDecimal(e.target.value, false, 3, null, null, prev.net_weight) }))}
                      placeholder={computedNetWt}
                      className="w-full px-3 py-2 bg-white border-2 border-amber-300 rounded-xl text-xs font-bold text-amber-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    />
                  </div>

                  {/* Making Charges / MC (₹) - Placed near Net Wt */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-gray-700">Making Charges</label>
                      <div className="inline-flex rounded-lg bg-amber-100/80 p-0.5 border border-amber-300 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, making_charge_type: 'per_gram' }))}
                          className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${formData.making_charge_type === 'per_gram'
                            ? 'bg-amber-600 text-white shadow-2xs'
                            : 'text-amber-900 hover:text-amber-950'
                            }`}
                        >
                          ₹/g
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, making_charge_type: 'total' }))}
                          className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${formData.making_charge_type !== 'per_gram'
                            ? 'bg-amber-600 text-white shadow-2xs'
                            : 'text-amber-900 hover:text-amber-950'
                            }`}
                        >
                          Total ₹
                        </button>
                      </div>
                    </div>
                    {formData.making_charge_type === 'per_gram' ? (
                      <div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          inputMode="decimal"
                          name="making_charge_rate"
                          value={formData.making_charge_rate}
                          onChange={(e) => setFormData(prev => ({ ...prev, making_charge_rate: sanitizeDecimal(e.target.value, false, 2, null, null, prev.making_charge_rate) }))}
                          placeholder="Rate ₹/g (e.g. 500)"
                          className="w-full px-3 py-2 bg-amber-50/50 border border-amber-300 rounded-xl text-xs font-bold text-amber-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                        />
                        <div className="mt-1 flex items-center justify-between text-[10px] text-amber-800 font-mono">
                          <span>Total MC: <strong className="font-bold text-amber-950">₹{effectiveMakingCharge.toFixed(2)}</strong></span>
                          <span>({netWtVal.toFixed(3)}g &times; ₹{parseFloat(formData.making_charge_rate) || 0})</span>
                        </div>
                      </div>
                    ) : (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                        name="making_charge"
                        value={formData.making_charge}
                        onChange={(e) => setFormData(prev => ({ ...prev, making_charge: sanitizeDecimal(e.target.value, false, 2, null, null, prev.making_charge) }))}
                        placeholder="0.00"
                        className="w-full px-3 py-2 bg-amber-50/50 border border-amber-300 rounded-xl text-xs font-bold text-amber-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* 24K Pure Gold Conversion Card */}
              <div className="p-4 bg-amber-100/70 border border-amber-300 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-extrabold text-sm shadow-xs">
                    24K
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-950 flex items-center gap-2">
                      <span>Fine Gold Weight (24K Equivalent):</span>
                      <span className="text-sm font-mono text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-lg border border-amber-300">
                        {computedFineWt} g ({computedFineWtKg} KG)
                      </span>
                    </h4>
                    <p className="text-[11px] text-amber-800">
                      Exact Formula: {netWtVal.toFixed(3)}g Net &times; ({effectiveTouchVal.toFixed(2)}% Purity [{touchVal.toFixed(1)}% Touch + {wastageVal.toFixed(1)}% Wastage] &divide; 100) = <strong>{computedFineWt}g 24K Pure Gold</strong>
                    </p>
                  </div>
                </div>

                <div className="w-full sm:w-auto">
                  <label className="block text-[11px] font-bold text-amber-950 mb-1">
                    Rate per gram (₹/g) <span className="text-stone-500 font-normal">(Leave 0 for 24K Gold Payable)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      inputMode="decimal"
                      name="rate"
                      value={formData.rate}
                      onChange={(e) => setFormData(prev => ({ ...prev, rate: sanitizeDecimal(e.target.value, false, 2, null, null, prev.rate) }))}
                      placeholder="0.00 (Unfixed)"
                      className="w-36 px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs font-bold text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <span className="text-xs font-mono font-bold text-stone-700">
                      {rateVal > 0 ? `₹${(netWtVal * rateVal).toFixed(2)}` : 'Metal Mode'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. CATEGORY SUB-FORM: 2. SILVER PURCHASE */}
          {purchaseCategory === 'silver' && (
            <div className="p-5 bg-gradient-to-br from-slate-50 via-white to-slate-100 border-2 border-slate-300 rounded-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-700 text-white flex items-center justify-center text-xs shadow-xs">
                    <i className="fa-solid fa-ring"></i>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Silver Purchase Details</h3>
                    <p className="text-[11px] text-slate-600">Vault silver inventory &bull; Silver stock &amp; metal ledger balance &bull; No gold/diamond fields</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-slate-900 bg-slate-200 border border-slate-300 px-3 py-1 rounded-full">
                  Settlement: {rateVal > 0 ? 'Monetary Cash Payable' : 'Silver Metal Payable'}
                </span>
              </div>

              <div className="space-y-4">
                {/* Row 1: Purity, Touch, Wastage, Effective Purity */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Silver Purity */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                      <span>Silver Standard <span className="text-red-500">*</span></span>
                      <Link to="/masters/karats" className="text-[10px] text-[#b01622] hover:underline font-bold">
                        + Karat/Master
                      </Link>
                    </label>
                    <select
                      name="purity"
                      value={formData.purity || '999 Fine Silver'}
                      onChange={(e) => {
                        const pur = e.target.value;
                        let touch = '99.9';
                        if (pur.includes('925')) touch = '92.5';
                        else if (pur.includes('900')) touch = '90.0';
                        else if (pur.includes('800')) touch = '80.0';
                        setFormData(prev => ({ ...prev, purity: pur, touch: touch }));
                      }}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    >
                      <option value="999 Fine Silver">999 Fine Silver (99.9%)</option>
                      <option value="925 Sterling Silver">925 Sterling Silver (92.5%)</option>
                      <option value="900 Silver">900 Silver (90.0%)</option>
                      <option value="800 Silver">800 Silver (80.0%)</option>
                      {karatsList.filter(k => (k.applicable_for || '').toLowerCase().includes('silver')).map(k => (
                        <option key={k.id} value={k.name}>{k.name}</option>
                      ))}
                      <option value="Custom Silver">Custom Silver</option>
                    </select>
                  </div>

                  {/* Touch (%) */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Touch (%) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max="100"
                      inputMode="decimal"
                      name="touch"
                      value={formData.touch}
                      onChange={(e) => setFormData(prev => ({ ...prev, touch: sanitizeDecimal(e.target.value, false, 3, null, null, prev.touch) }))}
                      placeholder="99.9"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    />
                  </div>

                  {/* Wastage (%) */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                      <span>Wastage (%)</span>
                      <span className="text-[10px] text-stone-500 font-normal">Adds to Touch</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max="100"
                      inputMode="decimal"
                      name="wastage_percent"
                      value={formData.wastage_percent}
                      onChange={(e) => setFormData(prev => ({ ...prev, wastage_percent: sanitizeDecimal(e.target.value, false, 3, null, null, prev.wastage_percent) }))}
                      placeholder="0.000"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    />
                  </div>

                  {/* Effective Purity (%) */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Effective Purity (%)
                    </label>
                    <div className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 font-mono flex items-center justify-between">
                      <span>{effectiveTouchVal.toFixed(2)}%</span>
                      <span className="text-[10px] text-slate-600 font-normal">
                        ({touchVal.toFixed(1)}% Touch + {wastageVal.toFixed(1)}% Wastage)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Row 2: Weights, Making Charges & Rate */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {/* Gross Weight (g) */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Gross Weight (g) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      inputMode="decimal"
                      name="weight"
                      value={formData.weight}
                      onChange={(e) => {
                        const newGross = sanitizeDecimal(e.target.value, false, 3, null, null, formData.weight);
                        const less = parseFloat(formData.less_weight) || 0;
                        const calculatedNet = Math.max(0, (parseFloat(newGross) || 0) - less).toFixed(3);
                        setFormData(prev => ({
                          ...prev,
                          weight: newGross,
                          net_weight: calculatedNet
                        }));
                      }}
                      required
                      placeholder="0.000"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    />
                  </div>

                  {/* Less Weight (g) */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Less Weight (g)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      inputMode="decimal"
                      name="less_weight"
                      value={formData.less_weight}
                      onChange={(e) => {
                        const newLess = sanitizeDecimal(e.target.value, false, 3, null, null, formData.less_weight);
                        const gross = parseFloat(formData.weight) || 0;
                        const calculatedNet = Math.max(0, gross - (parseFloat(newLess) || 0)).toFixed(3);
                        setFormData(prev => ({
                          ...prev,
                          less_weight: newLess,
                          net_weight: calculatedNet
                        }));
                      }}
                      placeholder="0.000"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    />
                  </div>

                  {/* Explicit Net Silver Weight (g) */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                      <span>Net Weight (g) <span className="text-red-500">*</span></span>
                      <span className="text-[10px] text-stone-500 font-normal">Editable</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      inputMode="decimal"
                      name="net_weight"
                      value={formData.net_weight !== '' ? formData.net_weight : computedNetWt}
                      onChange={(e) => setFormData(prev => ({ ...prev, net_weight: sanitizeDecimal(e.target.value, false, 3, null, null, prev.net_weight) }))}
                      placeholder={computedNetWt}
                      className="w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    />
                  </div>

                  {/* Making Charges / MC (₹) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-gray-700">Making Charges</label>
                      <div className="inline-flex rounded-lg bg-slate-200 p-0.5 border border-slate-300 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, making_charge_type: 'per_gram' }))}
                          className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${formData.making_charge_type === 'per_gram'
                            ? 'bg-slate-700 text-white shadow-2xs'
                            : 'text-slate-800 hover:text-black'
                            }`}
                        >
                          ₹/g
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, making_charge_type: 'total' }))}
                          className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${formData.making_charge_type !== 'per_gram'
                            ? 'bg-slate-700 text-white shadow-2xs'
                            : 'text-slate-800 hover:text-black'
                            }`}
                        >
                          Total ₹
                        </button>
                      </div>
                    </div>
                    {formData.making_charge_type === 'per_gram' ? (
                      <div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          inputMode="decimal"
                          name="making_charge_rate"
                          value={formData.making_charge_rate}
                          onChange={(e) => setFormData(prev => ({ ...prev, making_charge_rate: sanitizeDecimal(e.target.value, false, 2, null, null, prev.making_charge_rate) }))}
                          placeholder="Rate ₹/g (e.g. 15)"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                        />
                        <div className="mt-1 flex items-center justify-between text-[10px] text-slate-700 font-mono">
                          <span>Total MC: <strong className="font-bold text-slate-900">₹{effectiveMakingCharge.toFixed(2)}</strong></span>
                          <span>({netWtVal.toFixed(3)}g &times; ₹{parseFloat(formData.making_charge_rate) || 0})</span>
                        </div>
                      </div>
                    ) : (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                        name="making_charge"
                        value={formData.making_charge}
                        onChange={(e) => setFormData(prev => ({ ...prev, making_charge: sanitizeDecimal(e.target.value, false, 2, null, null, prev.making_charge) }))}
                        placeholder="0.00"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                      />
                    )}
                  </div>

                  {/* Purchase Rate (₹/g) */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Rate per gram (₹/g)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      inputMode="decimal"
                      name="rate"
                      value={formData.rate}
                      onChange={(e) => setFormData(prev => ({ ...prev, rate: sanitizeDecimal(e.target.value, false, 2, null, null, prev.rate) }))}
                      placeholder="0.00 (Unfixed)"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    />
                  </div>
                </div>
              </div>

              {/* Silver Settlement Banner */}
              <div className="p-3 bg-slate-100 border border-slate-300 rounded-xl flex items-center justify-between text-xs">
                <span className="text-slate-800 font-medium">
                  {rateVal > 0
                    ? `Monetary Payable: ₹${(netWtVal * rateVal).toFixed(2)} recorded in supplier's cash balance.`
                    : `Silver Payable: ${netWtVal.toFixed(3)}g recorded directly in supplier's silver metal balance without creating monetary debt.`
                  }
                </span>
                <span className="font-bold text-slate-900">
                  Stock: +{netWtVal.toFixed(3)}g Silver
                </span>
              </div>
            </div>
          )}

          {/* 3. CATEGORY SUB-FORM: 3. DIAMOND PURCHASE */}
          {purchaseCategory === 'diamond' && (
            <div className="p-5 bg-gradient-to-br from-cyan-50/70 via-white to-blue-50/30 border-2 border-cyan-200 rounded-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-cyan-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-cyan-600 text-white flex items-center justify-center text-xs shadow-xs">
                    <i className="fa-solid fa-gem"></i>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-cyan-950 uppercase tracking-wider">Diamond Parcel Component Rows</h3>
                    <p className="text-[11px] text-cyan-700">Enter multiple sieve/stamp types &bull; Preserves stamp-wise vault inventory &bull; Carat &amp; Piece counting</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addDiamondRow}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <i className="fa-solid fa-plus text-[10px]"></i>
                  + Add Diamond Type
                </button>
              </div>

              {/* Diamond Repeatable Component-Rows Table */}
              <div className="overflow-x-auto border border-cyan-200 rounded-xl bg-white shadow-2xs">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-cyan-100/70 text-cyan-950 font-bold border-b border-cyan-200">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">S.No</th>
                      <th className="py-2.5 px-3 min-w-[140px]">Stamp / Sieve Size <span className="text-red-500">*</span></th>
                      <th className="py-2.5 px-3 min-w-[130px]">Diamond Shape / Type</th>
                      <th className="py-2.5 px-3 min-w-[90px] text-right">Stones (Pcs)</th>
                      <th className="py-2.5 px-3 min-w-[100px] text-right">Carats (ct) <span className="text-red-500">*</span></th>
                      <th className="py-2.5 px-3 min-w-[110px] text-right">Rate (₹/ct)</th>
                      <th className="py-2.5 px-3 min-w-[110px] text-right">Row Value (₹)</th>
                      <th className="py-2.5 px-3 min-w-[120px]">Notes</th>
                      <th className="py-2.5 px-3 w-10 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cyan-100">
                    {diamondRows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 px-4 text-center bg-cyan-50/20 text-cyan-900">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600 text-sm">
                              <i className="fa-solid fa-gem"></i>
                            </div>
                            <p className="text-xs text-gray-600 font-medium">No diamond component rows.</p>
                            <button
                              type="button"
                              onClick={addDiamondRow}
                              className="mt-1 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold rounded-xl cursor-pointer inline-flex items-center gap-1.5 shadow-xs transition-colors"
                            >
                              <i className="fa-solid fa-plus text-[10px]"></i>
                              + Add Diamond Type
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      diamondRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-cyan-50/40">
                          <td className="py-2 px-3 text-center font-bold text-cyan-800">{idx + 1}</td>
                          {/* Stamp - Selected Directly from Stamp Masters */}
                          <td className="py-2 px-3">
                            <select
                              value={row.stamp}
                              onChange={(e) => updateDiamondRow(idx, 'stamp', e.target.value)}
                              required
                              className="w-full px-2.5 py-1.5 bg-white border border-cyan-200 rounded-lg text-xs font-bold text-cyan-950 focus:outline-none focus:border-cyan-600 cursor-pointer"
                            >
                              <option value="">-- Select Stamp Master --</option>
                              {diamondMasterStamps.map(st => (
                                <option key={st.id} value={st.name}>
                                  {st.name} {st.code && st.code !== st.name ? `(${st.code})` : ''}
                                </option>
                              ))}
                              {row.stamp && !diamondMasterStamps.some(st => st.name === row.stamp) && (
                                <option value={row.stamp}>{row.stamp}</option>
                              )}
                            </select>
                          </td>
                          {/* Diamond Shape / Type */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              list="diamond-shape-list"
                              value={row.diamond_type}
                              onChange={(e) => updateDiamondRow(idx, 'diamond_type', e.target.value)}
                              placeholder="Shape / Cut"
                              className="w-full px-2.5 py-1.5 bg-white border border-cyan-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-cyan-600"
                            />
                            <datalist id="diamond-shape-list">
                              {stylesList.map(s => (
                                <option key={s.id} value={s.name} />
                              ))}
                              <option value="Round Brilliant" />
                              <option value="Princess" />
                              <option value="Baguette" />
                              <option value="Marquise" />
                              <option value="Oval" />
                              <option value="Pear" />
                              <option value="Emerald Cut" />
                              <option value="Cushion" />
                              <option value="Heart" />
                              <option value="Rose Cut" />
                            </datalist>
                          </td>
                          {/* Pieces */}
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={row.stones_count}
                              onChange={(e) => updateDiamondRow(idx, 'stones_count', e.target.value)}
                              placeholder="1"
                              className="w-full px-2 py-1.5 bg-white border border-cyan-200 rounded-lg text-xs font-mono font-bold text-right text-gray-800 focus:outline-none focus:border-cyan-600"
                            />
                          </td>
                          {/* Carats */}
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={row.weight_carats}
                              onChange={(e) => updateDiamondRow(idx, 'weight_carats', e.target.value)}
                              placeholder="0.000"
                              required
                              className="w-full px-2 py-1.5 bg-cyan-50/70 border border-cyan-300 rounded-lg text-xs font-mono font-bold text-right text-cyan-900 focus:outline-none focus:border-cyan-600"
                            />
                          </td>
                          {/* Rate */}
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={row.rate_per_carat}
                              onChange={(e) => updateDiamondRow(idx, 'rate_per_carat', e.target.value)}
                              placeholder="0.00"
                              className="w-full px-2 py-1.5 bg-white border border-cyan-200 rounded-lg text-xs font-mono text-right text-gray-800 focus:outline-none focus:border-cyan-600"
                            />
                          </td>
                          {/* Row Value */}
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={row.row_value}
                              onChange={(e) => updateDiamondRow(idx, 'row_value', e.target.value)}
                              placeholder="0.00"
                              className="w-full px-2 py-1.5 bg-white border border-cyan-200 rounded-lg text-xs font-mono font-bold text-right text-cyan-950 focus:outline-none focus:border-cyan-600"
                            />
                          </td>
                          {/* Notes */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={row.notes}
                              onChange={(e) => updateDiamondRow(idx, 'notes', e.target.value)}
                              placeholder="Lot / Grade..."
                              className="w-full px-2 py-1.5 bg-white border border-cyan-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-cyan-600"
                            />
                          </td>
                          {/* Action */}
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeDiamondRow(idx)}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                              title="Delete Row"
                            >
                              <i className="fa-solid fa-trash-can text-xs"></i>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Diamond Material Details & Wastage / Making Charges Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
                <div className="p-3 bg-cyan-100/60 border border-cyan-200 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-950">Total Pieces:</span>
                  <span className="text-sm font-mono font-extrabold text-cyan-900">{totalDiamondPieces} pcs</span>
                </div>
                <div className="p-3 bg-blue-100/60 border border-blue-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-blue-950 block">Net Wt (ct):</span>
                    <span className="text-[10px] text-blue-700">Total Carats</span>
                  </div>
                  <span className="text-sm font-mono font-extrabold text-blue-900">{totalDiamondCarats.toFixed(3)} ct</span>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Wastage (%)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    inputMode="decimal"
                    name="wastage_percent"
                    value={formData.wastage_percent}
                    onChange={(e) => setFormData(prev => ({ ...prev, wastage_percent: sanitizeDecimal(e.target.value, false, 2, null, null, prev.wastage_percent) }))}
                    placeholder="0.00%"
                    className="w-full px-3 py-2 bg-white border border-cyan-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-gray-700">Making Charges</label>
                    <div className="inline-flex rounded-lg bg-cyan-100 p-0.5 border border-cyan-200 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, making_charge_type: 'per_ct' }))}
                        className={`px-1.5 py-0.5 rounded font-bold transition-all cursor-pointer ${formData.making_charge_type === 'per_ct'
                          ? 'bg-cyan-700 text-white shadow-2xs'
                          : 'text-cyan-900 hover:text-black'
                          }`}
                      >
                        ₹/ct
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, making_charge_type: 'total' }))}
                        className={`px-1.5 py-0.5 rounded font-bold transition-all cursor-pointer ${formData.making_charge_type !== 'per_ct'
                          ? 'bg-cyan-700 text-white shadow-2xs'
                          : 'text-cyan-900 hover:text-black'
                          }`}
                      >
                        Total ₹
                      </button>
                    </div>
                  </div>
                  {formData.making_charge_type === 'per_ct' ? (
                    <div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                        name="making_charge_rate"
                        value={formData.making_charge_rate}
                        onChange={(e) => setFormData(prev => ({ ...prev, making_charge_rate: sanitizeDecimal(e.target.value, false, 2, null, null, prev.making_charge_rate) }))}
                        placeholder="Rate ₹/ct"
                        className="w-full px-3 py-2 bg-white border border-cyan-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                      />
                      <div className="mt-1 flex items-center justify-between text-[10px] text-cyan-800 font-mono">
                        <span>Total MC: <strong className="font-bold text-cyan-950">₹{effectiveMakingCharge.toFixed(2)}</strong></span>
                        <span>({totalDiamondCarats.toFixed(3)}ct &times; ₹{parseFloat(formData.making_charge_rate) || 0})</span>
                      </div>
                    </div>
                  ) : (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      inputMode="decimal"
                      name="making_charge"
                      value={formData.making_charge}
                      onChange={(e) => setFormData(prev => ({ ...prev, making_charge: sanitizeDecimal(e.target.value, false, 2, null, null, prev.making_charge) }))}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-white border border-cyan-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    />
                  )}
                </div>
                <div className="p-3 bg-emerald-100/60 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950">Row Valuation:</span>
                  <span className="text-sm font-mono font-extrabold text-emerald-900">₹{totalDiamondAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* 3. CATEGORY SUB-FORM: 4. FINISHED JEWELLERY PURCHASE */}
          {purchaseCategory === 'finished' && (
            <div className="p-5 bg-gradient-to-br from-purple-50/70 via-white to-pink-50/30 border-2 border-purple-200 rounded-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-purple-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center text-xs shadow-xs">
                    <i className="fa-solid fa-crown"></i>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-purple-950 uppercase tracking-wider">Finished Jewellery Catalog &amp; Multi-Material Breakdown</h3>
                    <p className="text-[11px] text-purple-700">Creates/updates product SKU &bull; Gold base + repeatable diamond &amp; stone rows &bull; Does not mix with raw gold stock</p>
                  </div>
                </div>
              </div>

              {/* Catalog Mode */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setJewelMode('new_item')}
                  className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${jewelMode === 'new_item'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                >
                  <i className="fa-solid fa-plus-circle mr-1"></i> Register New Product SKU
                </button>
                <button
                  type="button"
                  onClick={() => setJewelMode('existing')}
                  className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${jewelMode === 'existing'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                >
                  <i className="fa-solid fa-list mr-1"></i> Select Existing Catalog Item
                </button>
              </div>

              {jewelMode === 'new_item' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-white rounded-xl border border-purple-200">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Item Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="item_name"
                      value={formData.item_name}
                      onChange={handleInputChange}
                      placeholder="e.g. 22K Peacock Necklace"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-purple-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">SKU / Product Code</label>
                    <input
                      type="text"
                      name="sku"
                      value={formData.sku}
                      onChange={handleInputChange}
                      placeholder="e.g. JW-NK-042"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-purple-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Design No</label>
                    <input
                      type="text"
                      name="design_no"
                      value={formData.design_no}
                      onChange={handleInputChange}
                      placeholder="e.g. D-994"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-purple-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Category</label>
                    <select
                      name="category_id"
                      value={formData.category_id}
                      onChange={handleCategoryChange}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-purple-600"
                    >
                      <option value="">-- Select Category --</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-white rounded-xl border border-purple-200">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Select Existing Product <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="product_id"
                    value={formData.product_id}
                    onChange={handleProductChange}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-purple-600"
                  >
                    <option value="">-- Select Product From Catalog --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku || p.product_code || 'No SKU'}) &mdash; Stock: {p.stock_qty || 0} Pcs
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Finished Jewellery Gold Base Section */}
              <div className="p-4 bg-white rounded-xl border border-purple-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-purple-950 uppercase">Gold Metal Composition</h4>
                  <span className="text-[11px] font-bold text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full font-mono">
                    Touch {parseFloat(formData.touch || 91.667).toFixed(1)}% + Wastage {parseFloat(formData.wastage_percent || 0).toFixed(1)}% = Purity {effectiveTouchVal.toFixed(2)}%
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Gold Karat</label>
                    <select
                      name="gold_karat"
                      value={formData.gold_karat || (karatsList[0]?.name || '22K')}
                      onChange={(e) => {
                        const k = e.target.value;
                        let defaultTouch = '91.667';
                        const karatNumMatch = k.match(/(\d+)\s*K/i);
                        if (karatNumMatch) {
                          const num = parseFloat(karatNumMatch[1]);
                          defaultTouch = ((num / 24) * 100).toFixed(3);
                        } else if (k.includes('24') || k.includes('999')) defaultTouch = '100.000';
                        else if (k.includes('22') || k.includes('916')) defaultTouch = '91.667';
                        else if (k.includes('18') || k.includes('750')) defaultTouch = '75.000';
                        else if (k.includes('14') || k.includes('585')) defaultTouch = '58.333';
                        setFormData(prev => ({ ...prev, gold_karat: k, touch: defaultTouch }));
                      }}
                      className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-bold text-gray-800"
                    >
                      <option value="">-- Karat Master --</option>
                      {karatsList.map(k => (
                        <option key={k.id} value={k.name}>
                          {formatKaratLabel(k)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Touch (%) *</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max="100"
                      name="touch"
                      value={formData.touch}
                      onChange={(e) => setFormData(prev => ({ ...prev, touch: sanitizeDecimal(e.target.value, false, 3, null, null, prev.touch) }))}
                      placeholder="91.667"
                      className="w-full px-2.5 py-1.5 bg-white border border-purple-200 rounded-lg text-xs font-bold text-emerald-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Gross Wt (g) *</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      name="weight"
                      value={formData.weight}
                      onChange={(e) => {
                        const newGross = sanitizeDecimal(e.target.value, false, 3, null, null, formData.weight);
                        const less = parseFloat(formData.less_weight) || 0;
                        setFormData(prev => ({ ...prev, weight: newGross, net_weight: Math.max(0, (parseFloat(newGross) || 0) - (less * 0.2)).toFixed(3) }));
                      }}
                      required
                      placeholder="0.000"
                      className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-bold text-amber-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1 flex items-center justify-between">
                      <span>Less Wt (ct)</span>
                      {(totalDiamondCarats + totalStoneCarats) > 0 && (
                        <span className="text-[9px] text-purple-700 font-mono">{(totalDiamondCarats + totalStoneCarats).toFixed(3)}ct</span>
                      )}
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      name="less_weight"
                      value={formData.less_weight}
                      onChange={(e) => {
                        const newLess = sanitizeDecimal(e.target.value, false, 3, null, null, formData.less_weight);
                        const gross = parseFloat(formData.weight) || 0;
                        setFormData(prev => ({ ...prev, less_weight: newLess, net_weight: Math.max(0, gross - (parseFloat(newLess) || 0) * 0.2).toFixed(3) }));
                      }}
                      placeholder="0.000"
                      className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-bold text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Net Gold Wt (g)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      name="net_weight"
                      value={formData.net_weight !== '' ? formData.net_weight : computedNetWt}
                      onChange={(e) => setFormData(prev => ({ ...prev, net_weight: sanitizeDecimal(e.target.value, false, 3, null, null, prev.net_weight) }))}
                      placeholder={computedNetWt}
                      className="w-full px-2.5 py-1.5 bg-amber-50 border border-amber-300 rounded-lg text-xs font-bold text-amber-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Wastage (%)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      name="wastage_percent"
                      value={formData.wastage_percent}
                      onChange={(e) => setFormData(prev => ({ ...prev, wastage_percent: sanitizeDecimal(e.target.value, false, 2, null, null, prev.wastage_percent) }))}
                      placeholder="0.00%"
                      className="w-full px-2.5 py-1.5 bg-white border border-purple-200 rounded-lg text-xs font-bold text-gray-800"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-gray-600">Making Charges</label>
                      <div className="inline-flex rounded bg-purple-100/70 p-0.5 border border-purple-200 text-[9px]">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, making_charge_type: 'per_gram' }))}
                          className={`px-1.5 py-0.5 rounded font-bold transition-all cursor-pointer ${formData.making_charge_type === 'per_gram' ? 'bg-purple-600 text-white shadow-2xs' : 'text-purple-800'
                            }`}
                        >
                          ₹/g
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, making_charge_type: 'total' }))}
                          className={`px-1.5 py-0.5 rounded font-bold transition-all cursor-pointer ${formData.making_charge_type !== 'per_gram' ? 'bg-purple-600 text-white shadow-2xs' : 'text-purple-800'
                            }`}
                        >
                          Total ₹
                        </button>
                      </div>
                    </div>
                    {formData.making_charge_type === 'per_gram' ? (
                      <div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          name="making_charge_rate"
                          value={formData.making_charge_rate}
                          onChange={(e) => setFormData(prev => ({ ...prev, making_charge_rate: sanitizeDecimal(e.target.value, false, 2, null, null, prev.making_charge_rate) }))}
                          placeholder="Rate ₹/g"
                          className="w-full px-2.5 py-1.5 bg-white border border-purple-200 rounded-lg text-xs font-bold text-gray-800 font-mono"
                        />
                        <div className="text-[9px] text-purple-700 font-mono mt-0.5 truncate">
                          MC: ₹{effectiveMakingCharge.toFixed(2)}
                        </div>
                      </div>
                    ) : (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        name="making_charge"
                        value={formData.making_charge}
                        onChange={(e) => setFormData(prev => ({ ...prev, making_charge: sanitizeDecimal(e.target.value, false, 2, null, null, prev.making_charge) }))}
                        placeholder="0.00"
                        className="w-full px-2.5 py-1.5 bg-white border border-purple-200 rounded-lg text-xs font-bold text-gray-800 font-mono"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Fine Gold (g)</label>
                    <div className="w-full px-2.5 py-1.5 bg-amber-100 border border-amber-300 rounded-lg text-xs font-bold text-amber-950 font-mono">
                      {computedFineWt} g
                    </div>
                  </div>
                </div>
              </div>

              {/* Repeatable Diamond Rows in Finished Jewellery */}
              <div className="p-4 bg-white rounded-xl border border-cyan-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-cyan-950 uppercase flex items-center gap-1.5">
                    <i className="fa-solid fa-gem text-cyan-600"></i> Diamond Components
                  </h4>
                  <button
                    type="button"
                    onClick={addDiamondRow}
                    className="text-[11px] font-bold text-cyan-700 hover:text-cyan-900 flex items-center gap-1 cursor-pointer"
                  >
                    <i className="fa-solid fa-plus text-[10px]"></i> Add Diamond Row
                  </button>
                </div>
                {diamondRows.length > 0 && (
                  <div className="overflow-x-auto">
                    <div className="min-w-[650px] space-y-2">
                      {/* Header Row */}
                      <div className="grid grid-cols-12 gap-2 px-2 py-1 bg-cyan-100/70 rounded-lg text-[11px] font-bold text-cyan-950">
                        <div className="col-span-3">Stamp / Sieve Size *</div>
                        <div className="col-span-2">Shape / Cut</div>
                        <div className="col-span-1 text-right">Pcs</div>
                        <div className="col-span-2 text-right">Carats (ct) *</div>
                        <div className="col-span-2 text-right">Rate (₹/ct)</div>
                        <div className="col-span-2 text-right">Row Value (₹)</div>
                      </div>
                      {diamondRows.map((r, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2 p-2 bg-cyan-50/50 rounded-lg border border-cyan-100 text-xs items-center">
                          <div className="col-span-3">
                            <select
                              value={r.stamp}
                              onChange={(e) => updateDiamondRow(idx, 'stamp', e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-cyan-200 rounded text-xs font-bold text-cyan-950 cursor-pointer"
                            >
                              <option value="">-- Select Stamp Master --</option>
                              {diamondMasterStamps.map(st => (
                                <option key={st.id} value={st.name}>
                                  {st.name} {st.code && st.code !== st.name ? `(${st.code})` : ''}
                                </option>
                              ))}
                              {r.stamp && !diamondMasterStamps.some(st => st.name === r.stamp) && (
                                <option value={r.stamp}>{r.stamp}</option>
                              )}
                            </select>
                          </div>
                          <div className="col-span-2">
                            <input
                              type="text"
                              list="diamond-shape-list"
                              placeholder="Shape"
                              value={r.diamond_type}
                              onChange={(e) => updateDiamondRow(idx, 'diamond_type', e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-cyan-200 rounded text-xs"
                            />
                          </div>
                          <div className="col-span-1">
                            <input
                              type="number"
                              min="0"
                              placeholder="1"
                              value={r.stones_count}
                              onChange={(e) => updateDiamondRow(idx, 'stones_count', e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-cyan-200 rounded text-xs text-right font-mono"
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              placeholder="0.000"
                              value={r.weight_carats}
                              onChange={(e) => updateDiamondRow(idx, 'weight_carats', e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-cyan-200 rounded text-xs text-right font-mono font-bold text-cyan-900"
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              placeholder="0.00"
                              value={r.rate_per_carat}
                              onChange={(e) => updateDiamondRow(idx, 'rate_per_carat', e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-cyan-200 rounded text-xs text-right font-mono"
                            />
                          </div>
                          <div className="col-span-2 flex items-center justify-between gap-1">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              placeholder="0.00"
                              value={r.row_value}
                              onChange={(e) => updateDiamondRow(idx, 'row_value', e.target.value)}
                              className="w-full px-1.5 py-1 bg-white border border-cyan-200 rounded text-xs text-right font-mono font-bold text-cyan-950"
                            />
                            <button type="button" onClick={() => removeDiamondRow(idx)} className="text-red-500 hover:text-red-700 text-xs cursor-pointer p-1 shrink-0" title="Delete Row">
                              <i className="fa-solid fa-trash-can"></i>
                            </button>
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center justify-between px-3 py-1.5 bg-cyan-100/50 rounded-lg text-xs font-bold text-cyan-950">
                        <span>Total Diamonds: {totalDiamondPieces} Pcs</span>
                        <span>Total Carats: <strong className="font-mono">{totalDiamondCarats.toFixed(3)} ct</strong></span>
                        <span>Row Total: <strong className="font-mono text-cyan-900">₹{totalDiamondAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Repeatable Colour Stone Rows in Finished Jewellery */}
              <div className="p-4 bg-white rounded-xl border border-rose-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-rose-950 uppercase flex items-center gap-1.5">
                    <i className="fa-solid fa-ring text-rose-600"></i> Colour Stone Components
                  </h4>
                  <button
                    type="button"
                    onClick={addStoneRow}
                    className="text-[11px] font-bold text-rose-700 hover:text-rose-900 flex items-center gap-1 cursor-pointer"
                  >
                    <i className="fa-solid fa-plus text-[10px]"></i> Add Colour Stone Row
                  </button>
                </div>
                {stoneRows.length > 0 ? (
                  <div className="overflow-x-auto">
                    <div className="min-w-[650px] space-y-2">
                      {/* Header Row */}
                      <div className="grid grid-cols-12 gap-2 px-2 py-1 bg-rose-100/70 rounded-lg text-[11px] font-bold text-rose-950">
                        <div className="col-span-3">Stone Variety / Stamp *</div>
                        <div className="col-span-2">Shape / Cut</div>
                        <div className="col-span-1 text-right">Pcs</div>
                        <div className="col-span-2 text-right">Weight (ct) *</div>
                        <div className="col-span-2 text-right">Rate (₹/ct)</div>
                        <div className="col-span-2 text-right">Row Value (₹)</div>
                      </div>
                      {stoneRows.map((r, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2 p-2 bg-rose-50/50 rounded-lg border border-rose-100 text-xs items-center">
                          <div className="col-span-3">
                            <select
                              value={r.stamp}
                              onChange={(e) => updateStoneRow(idx, 'stamp', e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-rose-200 rounded text-xs font-bold text-rose-950 cursor-pointer"
                            >
                              <option value="">-- Select Stone Master --</option>
                              {stoneMasterStamps.map(st => (
                                <option key={st.id} value={st.name}>
                                  {st.name} {st.code && st.code !== st.name ? `(${st.code})` : ''}
                                </option>
                              ))}
                              {r.stamp && !stoneMasterStamps.some(st => st.name === r.stamp) && (
                                <option value={r.stamp}>{r.stamp}</option>
                              )}
                            </select>
                          </div>
                          <div className="col-span-2">
                            <input
                              type="text"
                              list="stone-shape-list"
                              placeholder="Shape"
                              value={r.stone_type}
                              onChange={(e) => updateStoneRow(idx, 'stone_type', e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-rose-200 rounded text-xs"
                            />
                            <datalist id="stone-shape-list">
                              <option value="Oval" />
                              <option value="Round" />
                              <option value="Pear" />
                              <option value="Emerald Cut" />
                              <option value="Cushion" />
                              <option value="Marquise" />
                              <option value="Cabochon" />
                            </datalist>
                          </div>
                          <div className="col-span-1">
                            <input
                              type="number"
                              min="0"
                              placeholder="1"
                              value={r.stones_count}
                              onChange={(e) => updateStoneRow(idx, 'stones_count', e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-rose-200 rounded text-xs text-right font-mono"
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              placeholder="0.000"
                              value={r.weight_carats}
                              onChange={(e) => updateStoneRow(idx, 'weight_carats', e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-rose-200 rounded text-xs text-right font-mono font-bold text-rose-900"
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              placeholder="0.00"
                              value={r.rate_per_carat}
                              onChange={(e) => updateStoneRow(idx, 'rate_per_carat', e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-rose-200 rounded text-xs text-right font-mono"
                            />
                          </div>
                          <div className="col-span-2 flex items-center justify-between gap-1">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              placeholder="0.00"
                              value={r.row_value}
                              onChange={(e) => updateStoneRow(idx, 'row_value', e.target.value)}
                              className="w-full px-1.5 py-1 bg-white border border-rose-200 rounded text-xs text-right font-mono font-bold text-rose-950"
                            />
                            <button type="button" onClick={() => removeStoneRow(idx)} className="text-red-500 hover:text-red-700 text-xs cursor-pointer p-1 shrink-0" title="Delete Row">
                              <i className="fa-solid fa-trash-can"></i>
                            </button>
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center justify-between px-3 py-1.5 bg-rose-100/50 rounded-lg text-xs font-bold text-rose-950">
                        <span>Total Stones: {totalStonePieces} Pcs</span>
                        <span>Total Weight: <strong className="font-mono">{totalStoneCarats.toFixed(3)} ct</strong></span>
                        <span>Row Total: <strong className="font-mono text-rose-900">₹{totalStoneAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No colour stones added. Click "+ Add Colour Stone Row" to add ruby, emerald, sapphire, etc.</p>
                )}
              </div>
            </div>
          )}

          {/* 4. VALUATION, TAXES & GRAND TOTAL */}
          <div className="bg-gray-50/80 rounded-2xl p-5 border border-gray-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <i className="fa-solid fa-receipt text-[#b01622]"></i>
                Valuation, GST Taxes &amp; Grand Total
              </span>
            </div>

            {/* Optional GST Taxes */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-3 rounded-xl border border-gray-200">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-gray-600">CGST (%)</label>
                  {cgstAmountVal > 0 && (
                    <span className="text-[10px] font-mono text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      ₹{cgstAmountVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    inputMode="decimal"
                    name="cgst_percent"
                    value={formData.cgst_percent}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    className="w-full pl-3 pr-7 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:border-[#b01622] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="absolute right-2.5 top-2 text-xs text-gray-400 font-bold pointer-events-none">%</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-gray-600">SGST (%)</label>
                  {sgstAmountVal > 0 && (
                    <span className="text-[10px] font-mono text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      ₹{sgstAmountVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    inputMode="decimal"
                    name="sgst_percent"
                    value={formData.sgst_percent}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    className="w-full pl-3 pr-7 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:border-[#b01622] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="absolute right-2.5 top-2 text-xs text-gray-400 font-bold pointer-events-none">%</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-gray-600">IGST (%) [Interstate]</label>
                  {igstAmountVal > 0 && (
                    <span className="text-[10px] font-mono text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      ₹{igstAmountVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    inputMode="decimal"
                    name="igst_percent"
                    value={formData.igst_percent}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    className="w-full pl-3 pr-7 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:border-[#b01622] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="absolute right-2.5 top-2 text-xs text-gray-400 font-bold pointer-events-none">%</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-gray-600">Total Tax Amount</label>
                </div>
                <div className="w-full px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-bold text-emerald-900 font-mono">
                  ₹{computedTaxTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Additional Charges & Total Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-gray-200">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                  <span>Making Charges / Labour (₹)</span>
                  {formData.making_charge_type === 'per_gram' && (
                    <span className="text-[10px] text-purple-700 font-mono font-bold">
                      ₹{parseFloat(formData.making_charge_rate) || 0}/g
                    </span>
                  )}
                  {formData.making_charge_type === 'per_ct' && (
                    <span className="text-[10px] text-cyan-700 font-mono font-bold">
                      ₹{parseFloat(formData.making_charge_rate) || 0}/ct
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  name="making_charge"
                  value={formData.making_charge_type !== 'total' ? effectiveMakingCharge.toFixed(2) : formData.making_charge}
                  onChange={(e) => {
                    if (formData.making_charge_type === 'total') {
                      setFormData(prev => ({ ...prev, making_charge: sanitizeDecimal(e.target.value, false, 2, null, null, prev.making_charge) }));
                    }
                  }}
                  readOnly={formData.making_charge_type !== 'total'}
                  placeholder="0.00"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#b01622] font-mono ${formData.making_charge_type !== 'total' ? 'bg-gray-100 text-gray-700 border border-gray-300' : 'bg-white border border-gray-300 text-gray-800'
                    }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Stone / Other Cost (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  name="stone_cost"
                  value={formData.stone_cost}
                  onChange={(e) => setFormData(prev => ({ ...prev, stone_cost: sanitizeDecimal(e.target.value, false, 2, null, null, prev.stone_cost) }))}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                  <span>Grand Total Amount (₹)</span>
                  {purchaseCategory === 'gold' && rateVal <= 0 && (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                      Payable: {computedFineWt}g (24K Gold)
                    </span>
                  )}
                  {purchaseCategory === 'silver' && rateVal <= 0 && (
                    <span className="text-[10px] font-bold text-slate-800 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                      Payable: {netWtVal.toFixed(3)}g (Silver)
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  name="total_amount"
                  value={formData.total_amount !== '' && formData.total_amount !== undefined ? formData.total_amount : computedTotal}
                  onChange={(e) => setFormData(prev => ({ ...prev, total_amount: sanitizeDecimal(e.target.value, false, 2, null, null, prev.total_amount) }))}
                  placeholder={computedTotal}
                  className="w-full px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm font-bold text-amber-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                />
              </div>
            </div>

            {/* CREDIT TERMS & DUE DATE BAR */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-gray-200 bg-stone-50/80 p-3.5 rounded-xl border border-stone-200">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Credit Terms (Days)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  name="credit_days"
                  value={formData.credit_days}
                  onChange={handleInputChange}
                  placeholder="e.g. 30, 60, 90 days"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Payment Due Date
                </label>
                <input
                  type="date"
                  name="due_date"
                  value={formData.due_date}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Initial Payment Status
                </label>
                <select
                  name="payment_status"
                  value={formData.payment_status}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                >
                  <option value="unpaid">Unpaid / Credit</option>
                  <option value="partial">Partial Payment</option>
                  <option value="paid">Fully Paid</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-700">
                    Amount Paid (₹) {formData.payment_status === 'partial' && <span className="text-red-500">*</span>}
                  </label>
                  {(() => {
                    const tot = parseFloat(formData.total_amount !== '' && formData.total_amount !== undefined ? formData.total_amount : computedTotal) || 0;
                    const paid = parseFloat(formData.paid_amount) || 0;
                    const due = Math.max(0, tot - paid);
                    return tot > 0 ? (
                      <span className={`text-[10px] font-mono font-bold ${due > 0 ? 'text-amber-800' : 'text-emerald-700'}`}>
                        Due: ₹{due.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    ) : null;
                  })()}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-gray-400 font-bold pointer-events-none">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    name="paid_amount"
                    value={formData.paid_amount}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    className={`w-full pl-7 pr-3.5 py-2.5 bg-white border ${
                      formData.payment_status === 'partial' && (!formData.paid_amount || parseFloat(formData.paid_amount) <= 0)
                        ? 'border-amber-400 ring-1 ring-amber-300'
                        : 'border-gray-300'
                    } rounded-xl text-xs font-mono font-bold text-emerald-800 focus:outline-none focus:ring-2 focus:ring-[#b01622]`}
                  />
                </div>
                {formData.payment_status === 'partial' && (!formData.paid_amount || parseFloat(formData.paid_amount) <= 0) && (
                  <p className="text-[10px] text-amber-700 font-semibold mt-1">
                    * Enter the advance or partial amount paid now.
                  </p>
                )}
                {formData.payment_status === 'paid' && (
                  <p className="text-[10px] text-emerald-700 font-semibold mt-1">
                    ✓ Total bill will be marked as fully settled.
                  </p>
                )}
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
                {purchaseCategory === 'gold' && `${netWtVal.toFixed(3)}g Gold (${computedFineWt}g 24K Pure Eq.) to Vault`}
                {purchaseCategory === 'silver' && `${netWtVal.toFixed(3)}g Silver Stock to Vault`}
                {purchaseCategory === 'diamond' && `${totalDiamondCarats.toFixed(3)}ct (${totalDiamondPieces} pcs) across ${diamondRows.length} diamond stamp(s) to Vault`}
                {purchaseCategory === 'finished' && `${netWtVal.toFixed(3)}g finished jewellery (${formData.item_name || 'Item'}) to Catalog`}
              </strong>{' '}
              and update Supplier balances.
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
                    Record materials already owned by Rudra Jewellery to establish starting stock balances without creating supplier debt.
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
                  className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-2 ${openingForm.material_type === 'gold'
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
                  className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-2 ${openingForm.material_type === 'diamond'
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
                  className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-2 ${openingForm.material_type === 'platinum'
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
                  className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-2 ${openingForm.material_type === 'stone'
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
                  className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-2 ${openingForm.material_type === 'silver'
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
                      Stamp Master
                    </label>
                    <select
                      name="stamp"
                      value={openingForm.stamp}
                      onChange={handleOpeningInputChange}
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    >
                      <option value="">-- Select Gold Stamp Master --</option>
                      {goldMasterStamps.map(s => (
                        <option key={s.id} value={s.name}>
                          {s.name} {s.code && s.code !== s.name ? `(${s.code})` : ''}
                        </option>
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
                      <option value="">-- Select Karat Master --</option>
                      {karatsList.map(k => (
                        <option key={k.id} value={k.name}>
                          {formatKaratLabel(k)}
                        </option>
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
                      {metalUnits.map(u => (
                        <option key={u.id} value={u.code || u.name}>
                          {u.name} {u.code ? `(${u.code})` : ''}
                        </option>
                      ))}
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
                      <option value="">-- Select Diamond Stamp / Grade Master --</option>
                      {diamondMasterStamps.map(s => (
                        <option key={s.id} value={s.name}>
                          {s.name} {s.code && s.code !== s.name ? `(${s.code})` : ''}
                        </option>
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
                      {diamondUnits.map(u => (
                        <option key={u.id} value={u.code || u.name}>
                          {u.name} {u.code ? `(${u.code})` : ''}
                        </option>
                      ))}
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
                      Stone Weight (ct)
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
                      {stoneMasterStamps.map(s => (
                        <option key={s.id} value={s.name}>
                          {s.name} {s.code && s.code !== s.name ? `(${s.code})` : ''}
                        </option>
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
                      {stoneUnits.map(u => (
                        <option key={u.id} value={u.code || u.name}>
                          {u.name} {u.code ? `(${u.code})` : ''}
                        </option>
                      ))}
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
                      Stamp Master
                    </label>
                    <select
                      name="stamp"
                      value={openingForm.stamp}
                      onChange={handleOpeningInputChange}
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    >
                      <option value="">-- Select Silver Stamp Master --</option>
                      {silverMasterStamps.map(s => (
                        <option key={s.id} value={s.name}>
                          {s.name} {s.code && s.code !== s.name ? `(${s.code})` : ''}
                        </option>
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
                      {metalUnits.map(u => (
                        <option key={u.id} value={u.code || u.name}>
                          {u.name} {u.code ? `(${u.code})` : ''}
                        </option>
                      ))}
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
                      Stamp Master
                    </label>
                    <select
                      name="stamp"
                      value={openingForm.stamp}
                      onChange={handleOpeningInputChange}
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                    >
                      <option value="">-- Select Platinum Stamp Master --</option>
                      {platinumMasterStamps.map(s => (
                        <option key={s.id} value={s.name}>
                          {s.name} {s.code && s.code !== s.name ? `(${s.code})` : ''}
                        </option>
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
                      {metalUnits.map(u => (
                        <option key={u.id} value={u.code || u.name}>
                          {u.name} {u.code ? `(${u.code})` : ''}
                        </option>
                      ))}
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
            const filteredOpeningStockEntries = openingStockEntries.filter((entry) => {
              if (openingFilterMaterial !== 'all' && entry.material_type?.toLowerCase() !== openingFilterMaterial.toLowerCase()) {
                return false;
              }
              if (openingSearchTerm.trim()) {
                const q = openingSearchTerm.toLowerCase().trim();
                const stockNo = (entry.stock_number || '').toLowerCase();
                const stamp = (entry.stamp || '').toLowerCase();
                const karat = (entry.karat || '').toLowerCase();
                const mat = (entry.material_type || '').toLowerCase();
                const date = (entry.entry_date || '').toLowerCase();
                const notes = (entry.notes || '').toLowerCase();
                return stockNo.includes(q) || stamp.includes(q) || karat.includes(q) || mat.includes(q) || date.includes(q) || notes.includes(q);
              }
              return true;
            });

            const openingTotalPages = Math.max(1, Math.ceil(filteredOpeningStockEntries.length / openingItemsPerPage));
            const currentOpeningPage = Math.min(Math.max(1, openingCurrentPage), openingTotalPages);
            const paginatedOpeningStockEntries = filteredOpeningStockEntries.slice(
              (currentOpeningPage - 1) * openingItemsPerPage,
              currentOpeningPage * openingItemsPerPage
            );

            return (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <i className="fa-solid fa-clock-rotate-left text-amber-700"></i>
                    <h3 className="text-sm font-bold text-gray-900">Recorded Opening Stock Audit Entries</h3>
                    <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {filteredOpeningStockEntries.length} {filteredOpeningStockEntries.length === 1 ? 'Record' : 'Records'}
                    </span>
                    {openingStockEntries.length !== filteredOpeningStockEntries.length && (
                      <span className="text-[10px] text-gray-400 font-medium">
                        (filtered from {openingStockEntries.length})
                      </span>
                    )}
                  </div>

                  {/* Filter, Search & Action Bar */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Material Filter */}
                    <div className="flex items-center bg-white border border-gray-200 rounded-xl p-0.5 text-xs">
                      {['all', 'gold', 'diamond', 'platinum', 'stone', 'silver'].map((mat) => (
                        <button
                          key={mat}
                          type="button"
                          onClick={() => {
                            setOpeningFilterMaterial(mat);
                            setOpeningCurrentPage(1);
                          }}
                          className={`px-2.5 py-1 rounded-lg font-semibold capitalize transition-all cursor-pointer text-[11px] ${
                            openingFilterMaterial === mat
                              ? 'bg-amber-700 text-white shadow-xs'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                          }`}
                        >
                          {mat === 'all' ? 'All Materials' : mat}
                        </button>
                      ))}
                    </div>

                    {/* Search Input */}
                    <div className="relative">
                      <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                      <input
                        type="text"
                        value={openingSearchTerm}
                        onChange={(e) => {
                          setOpeningSearchTerm(e.target.value);
                          setOpeningCurrentPage(1);
                        }}
                        placeholder="Search stock ref, stamp..."
                        className="pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-600 w-44 sm:w-52"
                      />
                      {openingSearchTerm && (
                        <button
                          type="button"
                          onClick={() => {
                            setOpeningSearchTerm('');
                            setOpeningCurrentPage(1);
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
                        >
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={fetchOpeningStockEntries}
                      className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl text-xs text-gray-700 font-semibold cursor-pointer flex items-center gap-1.5 transition-colors"
                      title="Reload opening stock list from database"
                    >
                      <i className="fa-solid fa-rotate text-xs text-gray-500"></i>
                      <span>Refresh</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      <tr>
                        <th className="py-3 px-3 text-center w-12">S.No</th>
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
                        paginatedOpeningStockEntries.map((entry, idx) => {
                          const rowNum = (currentOpeningPage - 1) * openingItemsPerPage + idx + 1;
                          return (
                            <tr key={entry.id} className="hover:bg-amber-50/30 transition-colors">
                              <td className="py-3 px-3 text-center font-mono text-gray-400 font-medium">{rowNum}</td>
                              <td className="py-3 px-4 font-mono font-bold text-gray-900">{entry.stock_number}</td>
                              <td className="py-3 px-4 text-gray-600">{entry.entry_date}</td>
                              <td className="py-3 px-4 font-semibold capitalize">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${entry.material_type === 'gold' ? 'bg-amber-100 text-amber-800' :
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
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={11} className="py-8 text-center text-gray-400">
                            {openingSearchTerm || openingFilterMaterial !== 'all'
                              ? 'No opening stock entries match your search criteria.'
                              : 'No opening stock records found. Use the form above to add initial business stock.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Permanent Working Pagination Bar */}
                <div className="border-t border-gray-100">
                  <Pagination
                    currentPage={currentOpeningPage}
                    totalPages={openingTotalPages}
                    totalItems={filteredOpeningStockEntries.length}
                    itemsPerPage={openingItemsPerPage}
                    showWhenEmpty={true}
                    onPageChange={(page) => setOpeningCurrentPage(page)}
                    onItemsPerPageChange={(num) => {
                      setOpeningItemsPerPage(num);
                      setOpeningCurrentPage(1);
                    }}
                  />
                </div>
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
                    <th className="py-3.5 px-3 text-center w-12">S.No</th>
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
                        <td className="py-3.5 px-3 text-center font-mono text-gray-400 font-medium">{idx + 1}</td>
                        <td className="py-3.5 px-4 font-bold text-gray-900 flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${row.material_type === 'Gold' ? 'bg-amber-500' :
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
                      <td colSpan={9} className="py-8 text-center text-gray-400">
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
                    <th className="py-3 px-3 text-center w-12">S.No</th>
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
                          <td className="py-3.5 px-3 text-center font-mono text-gray-400 font-medium">{idx + 1}</td>
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
                      <td colSpan={8} className="py-8 text-center text-gray-400">
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
                        <th className="py-3 px-3 text-center w-12">S.No</th>
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
                        paginatedDiamondStamps.map((d, idx) => {
                          const rowNum = (diamondCurrentPage - 1) * diamondItemsPerPage + idx + 1;
                          return (
                            <tr key={idx} className="hover:bg-cyan-50/30 transition-colors">
                              <td className="py-3 px-3 text-center font-mono text-gray-400 font-medium">{rowNum}</td>
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
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-gray-400">
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
                  <th className="py-3 px-4 text-center w-14">S.No</th>
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
                    <td colSpan="9" className="py-12 text-center text-gray-500">
                      <i className="fa-solid fa-inbox text-3xl text-gray-300 mb-2"></i>
                      <p className="font-semibold text-gray-700">No purchase entries recorded yet</p>
                      <p className="text-xs text-gray-400 mt-1">Use the form above to record raw material or finished jewellery purchases.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedEntries.map((item, idx) => {
                    const serialNo = (currentPage - 1) * itemsPerPage + idx + 1;
                    const fineWtGrams = parseFloat(item.fine_weight || 0);
                    const fineWtKg = (fineWtGrams / 1000).toFixed(3);
                    const isRaw = item.purchase_type === 'raw_material';
                    const itemImg = item.image || item.product?.image_url || item.product?.image;

                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedPurchaseForView(item)}
                        className="hover:bg-amber-50/60 cursor-pointer transition-colors group"
                      >
                        {/* S.No */}
                        <td className="py-3.5 px-4 text-center font-mono text-gray-500 font-semibold">
                          {serialNo}
                        </td>

                        {/* Ref No & Date */}
                        <td className="py-3.5 px-4 font-mono">
                          <div className="font-bold text-[#b01622] group-hover:underline">{item.purchase_no}</div>
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
                          {(item.design_no || item.product?.design_no) && (
                            <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-900 font-mono text-[10px] font-bold">
                              <i className="fa-solid fa-barcode text-[9px]"></i>
                              <span>Design: {item.design_no || item.product?.design_no}</span>
                            </div>
                          )}
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
                          {item.rate > 0 ? (
                            <>
                              <div className="font-bold text-gray-900">₹{Number(item.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                              <div className="text-[11px] text-gray-500">Rate: ₹{item.rate}/g</div>
                            </>
                          ) : (
                            <>
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                Gold Payable (No Rate)
                              </span>
                              <div className="text-[11px] font-mono font-bold text-amber-800 mt-0.5">{fineWtGrams.toFixed(2)} g 24K Pure</div>
                            </>
                          )}
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!(item.rate > 0) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConvertPurchaseModal(item);
                                }}
                                className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                                title="Fix rate and convert gold due to money payable"
                              >
                                <i className="fa-solid fa-coins text-[10px]"></i>
                                <span>Fix Rate</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPurchaseForView(item);
                              }}
                              className="p-1.5 text-gray-400 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                              title="View full purchase details"
                            >
                              <i className="fa-solid fa-eye text-xs"></i>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteEntry(item.id, item.purchase_no);
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete entry & reverse stock"
                            >
                              <i className="fa-regular fa-trash-can text-xs"></i>
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
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base ${editStockModal.materialType === 'Gold' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                  editStockModal.materialType === 'Diamond' ? 'bg-cyan-50 text-cyan-600 border border-cyan-200' :
                    editStockModal.materialType === 'Platinum' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                      editStockModal.materialType === 'Silver' ? 'bg-slate-100 text-slate-700 border border-slate-200' :
                        'bg-purple-50 text-purple-600 border border-purple-200'
                  }`}>
                  <i className={`fa-solid ${editStockModal.materialType === 'Gold' ? 'fa-coins' :
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

      {/* Full Purchase Details Modal */}
      <PurchaseDetailsModal
        isOpen={!!selectedPurchaseForView}
        onClose={() => setSelectedPurchaseForView(null)}
        purchase={selectedPurchaseForView}
        onDelete={handleDeleteEntry}
        onConvertPaymentMode={(p) => setConvertPurchaseModal(p)}
      />

      {/* Convert Purchase Payment Mode / Fix Rate Modal */}
      <ConvertPurchasePaymentModeModal
        isOpen={!!convertPurchaseModal}
        onClose={() => setConvertPurchaseModal(null)}
        purchase={convertPurchaseModal}
        onSuccess={() => {
          fetchData();
        }}
      />

    </div>
  );
}
