import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { compressImageFile } from '../../utils/imageCompressor';
import QuickDropdownCrudModal from '../../components/QuickDropdownCrudModal';
import { isMetalPurityStamp, isDiamondComponent } from '../../components/JewelleryTagCard';

export default function InventoryAddNewUpload() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const fileInputRef = useRef(null);

  // Flow step state: 6 = Step 1 (Main Gold Item Entry), 7 = Step 2 (Component Entry)
  const [pageStep, setPageStep] = useState(6);

  // Master lists
  const [categoriesList, setCategoriesList] = useState([]);
  const [componentCategoriesList, setComponentCategoriesList] = useState([]);
  const [subcategoriesList, setSubcategoriesList] = useState([]);
  const [karatsList, setKaratsList] = useState([]);
  const [stampsList, setStampsList] = useState([]);
  const [unitsList, setUnitsList] = useState([]);
  const [suppliersList, setSuppliersList] = useState([]);
  const [itemsMasterList, setItemsMasterList] = useState([]);
  const [selectedItemMasterId, setSelectedItemMasterId] = useState('');

  // Master management modals
  const [crudModalType, setCrudModalType] = useState(null); // 'karat' | 'stamp' | 'unit' | 'item' | 'component_category'
  const [showCrudModal, setShowCrudModal] = useState(false);

  // Context from Category Selection
  const [primaryCategory, setPrimaryCategory] = useState(null);
  const [primarySubcategory, setPrimarySubcategory] = useState(null);

  // Filter stamps dynamically by category
  const getFilteredStamps = (categoryName) => {
    if (!stampsList || stampsList.length === 0) return [];
    const cat = String(categoryName || activeCategory?.name || primaryCategory?.name || '').toLowerCase().trim();
    if (!cat) return stampsList;

    const filtered = stampsList.filter((st) => {
      if (!st.applicable_for) return true;
      const app = String(st.applicable_for).toLowerCase();
      if (app.includes('all')) return true;
      if (cat.includes('silver')) return app.includes('silver');
      if (cat.includes('gold')) return app.includes('gold');
      if (cat.includes('diamond')) return app.includes('diamond');
      if (cat.includes('stone') || cat.includes('gem') || cat.includes('pearl') || cat.includes('cz')) {
        return app.includes('stone') || app.includes('gem');
      }
      return app.includes(cat);
    });
    return filtered;
  };

  // Main Product Data (Gold Item saved from Step 1)
  const [mainProductData, setMainProductData] = useState(null);

  // Added components list for Step 2
  const [addedComponents, setAddedComponents] = useState([]);

  // Editing component ID state
  const [editingComponentTempId, setEditingComponentTempId] = useState(null);

  // Form State for active form entry (Step 1 or Step 2)
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeSubcategory, setActiveSubcategory] = useState(null);

  const [formData, setFormData] = useState({
    item_code: '', // SKU
    design_no: '', // Separate Design No.
    stock_qty: '1', // Stock Quantity (min 1)
    item_name: '',
    karat: '22K',
    purity: '91.6',
    gross_wt: '',
    net_wt: '',
    pure_weight: '',
    stone_weight: '',
    stamp: '',
    unit: 'g',
    size: '0.00',
    no_of_pieces: '1',
    vendor: '',
    vendor_name: '',
    vendor_id: '',
    quality: '',
    description: '',
    purchase_rate: '',
    purchase_value: '',
  });

  const [liveRates, setLiveRates] = useState(null);

  // Multi-Image Upload state
  const [images, setImages] = useState([]);
  const [imageError, setImageError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper check for Diamond or Stone categories
  const isDiamondOrStoneCat = (catName = '') => {
    const name = (catName || '').toLowerCase().trim();
    if (name.includes('diamond cut') || name.includes('diamond-cut')) return false;
    return name.includes('diamond') || name.includes('stone') || name.includes('gem') || name.includes('pearl') || name.includes('cz');
  };

  const isSilverCategory = (activeCategory?.name || primaryCategory?.name || '').toLowerCase().includes('silver');

  // Fetch Masters & Load Initial Category Context
  const fetchMasters = async () => {
    try {
      const [catRes, karatRes, stampRes, unitRes, rateRes, supplierRes, compCatRes] = await Promise.all([
        api.get('/inventory/categories').catch(() => api.get('/categories')),
        api.get('/karats').catch(() => ({ data: [] })),
        api.get('/stamps').catch(() => ({ data: [] })),
        api.get('/units').catch(() => ({ data: [] })),
        api.get('/metal-rates').catch(() => ({ data: null })),
        api.get('/suppliers').catch(() => ({ data: { data: [] } })),
        api.get('/component-categories').catch(() => ({ data: [] })),
      ]);

      const cats = catRes.data?.categories || catRes.data || [];
      setCategoriesList(cats);
      setKaratsList(karatRes.data || []);
      setStampsList(stampRes.data || []);
      setUnitsList(unitRes.data || []);
      setComponentCategoriesList(compCatRes.data || []);
      const sups = supplierRes.data?.data || supplierRes.data || [];
      setSuppliersList(Array.isArray(sups) ? sups : []);

      if (rateRes.data) {
        setLiveRates(rateRes.data);
      }
    } catch (err) {
      console.error('Failed to load master data:', err);
    }
  };

  useEffect(() => {
    fetchMasters();

    const savedCat = sessionStorage.getItem('inventory_selected_category');
    const savedSub = sessionStorage.getItem('inventory_selected_subcategory');

    if (!savedCat) {
      showToast('Please select a category first', 'warning');
      navigate('/inventory/add-new/category');
      return;
    }

    try {
      const catObj = JSON.parse(savedCat);
      const subObj = savedSub ? JSON.parse(savedSub) : null;

      setPrimaryCategory(catObj);
      setPrimarySubcategory(subObj);
      setActiveCategory(catObj);
      setActiveSubcategory(subObj);

      const subName = subObj?.name || catObj?.name || 'Jewelry';
      const defaultCode = generateCode(catObj);
      const isSil = (catObj?.name || '').toLowerCase().includes('silver');

      setFormData((prev) => ({
        ...prev,
        item_code: defaultCode,
        item_name: subName,
        stamp: isSil ? '925' : '',
        karat: isSil ? '925 Silver' : '22K',
        purity: isSil ? '92.5' : '91.6',
      }));
    } catch (e) {
      navigate('/inventory/add-new/category');
    }
  }, []);



  useEffect(() => {
    if (activeCategory) {
      const subcats = activeCategory.subcategories || [];
      setSubcategoriesList(subcats);
    } else {
      setSubcategoriesList([]);
    }
  }, [activeCategory]);

  useEffect(() => {
    if (activeSubcategory?.id) {
      api.get('/items', { params: { subcategory_id: activeSubcategory.id } })
        .then((res) => {
          const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
          setItemsMasterList(list);
          if (list.length > 0 && pageStep === 6) {
            setSelectedItemMasterId(list[0].id);
            setFormData(prev => ({
              ...prev,
              item_name: prev.item_name || list[0].name,
            }));
          } else {
            setSelectedItemMasterId('');
          }
        })
        .catch((err) => console.error('Failed to load items for subcategory:', err));
    } else {
      setItemsMasterList([]);
      setSelectedItemMasterId('');
    }
  }, [activeSubcategory]);

  const generateCode = (catObj) => {
    const prefix = catObj?.code ? catObj.code.slice(0, 3).toUpperCase() : 'RJ';
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${rand}`;
  };

  const getAutoGoldRate = (catName = '', purityStr = '', karatStr = '', ratesObj = null) => {
    const rates = ratesObj || liveRates;
    const cat = (catName || '').toLowerCase();

    if (cat.includes('silver')) {
      const silRate = rates?.rawSilverGram || rates?.silverGram || '';
      return silRate ? String(silRate) : '';
    }

    const g24 = rates?.raw24k || (rates?.gold24k ? parseFloat(String(rates.gold24k).replace(/,/g, '')) : 0);
    const g22 = rates?.raw22k || (rates?.gold22k ? parseFloat(String(rates.gold22k).replace(/,/g, '')) : 0);
    const g18 = rates?.raw18k || (rates?.gold18k ? parseFloat(String(rates.gold18k).replace(/,/g, '')) : 0);

    const pur = parseFloat(purityStr) || 0;
    const kStr = (karatStr || '').toUpperCase();

    if (kStr.includes('24') || pur > 95) {
      return g24 ? String(g24) : '';
    }
    if (kStr.includes('22') || (pur > 88 && pur <= 95)) {
      return g22 ? String(g22) : (g24 ? String(Math.round(g24 * (22 / 24))) : '');
    }
    if (kStr.includes('18') || (pur > 70 && pur <= 88)) {
      return g18 ? String(g18) : (g24 ? String(Math.round(g24 * (18 / 24))) : '');
    }
    if (pur > 0 && g24 > 0) {
      return String(Math.round(g24 * (pur / 100)));
    }
    return g22 ? String(g22) : (g24 ? String(g24) : '');
  };

  // Fine Gold Weight = Net Gold Weight * (Purity Percentage / 100)
  const computePureWeight = (netWtStr, purityStr) => {
    const net = parseFloat(netWtStr) || 0;
    const purity = parseFloat(purityStr) || 0;
    if (net <= 0 || purity <= 0) return '';
    const factor = purity > 1 ? purity / 100 : purity;
    return (net * factor).toFixed(3);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      if (pageStep === 6) {
        // Step 1: Main Gold Item
        if (name === 'gross_wt' || name === 'net_wt' || name === 'purity' || name === 'purchase_rate') {
          const netValue = name === 'net_wt' ? value : (updated.net_wt || updated.gross_wt);
          updated.pure_weight = computePureWeight(netValue, updated.purity);
          const rateNum = parseFloat(updated.purchase_rate) || 0;
          const netNum = parseFloat(netValue) || 0;
          updated.purchase_value = rateNum > 0 && netNum > 0 ? (netNum * rateNum).toFixed(2) : '';
        }

        if (name === 'gross_wt' && (!prev.net_wt || prev.net_wt === prev.gross_wt)) {
          updated.net_wt = value;
          updated.pure_weight = computePureWeight(value, updated.purity);
          const rateNum = parseFloat(updated.purchase_rate) || 0;
          const netNum = parseFloat(value) || 0;
          updated.purchase_value = rateNum > 0 && netNum > 0 ? (netNum * rateNum).toFixed(2) : '';
        }

        if (name === 'karat') {
          if (value.includes('24')) updated.purity = '99.9';
          else if (value.includes('22')) updated.purity = '91.6';
          else if (value.includes('18')) updated.purity = '75.0';
          else if (value.includes('14')) updated.purity = '58.5';

          const netValue = updated.net_wt || updated.gross_wt;
          updated.pure_weight = computePureWeight(netValue, updated.purity);
          const rateNum = parseFloat(updated.purchase_rate) || 0;
          const netNum = parseFloat(netValue) || 0;
          updated.purchase_value = rateNum > 0 && netNum > 0 ? (netNum * rateNum).toFixed(2) : '';
        }
      } else {
        // Step 2: Component Entry
        const isDiaOrStone = isDiamondOrStoneCat(activeCategory?.name);

        if (!isDiaOrStone) {
          if (name === 'gross_wt' || name === 'net_wt' || name === 'purity') {
            const netValue = name === 'net_wt' ? value : (updated.net_wt || updated.gross_wt);
            updated.pure_weight = computePureWeight(netValue, updated.purity);
          }
        }

        if (name === 'purchase_rate' || name === 'stone_weight' || name === 'gross_wt') {
          const wtNum = isDiaOrStone
            ? (parseFloat(updated.stone_weight || updated.gross_wt) || 0)
            : (parseFloat(updated.gross_wt) || 0);
          const rateNum = parseFloat(updated.purchase_rate) || 0;
          updated.purchase_value = rateNum > 0 && wtNum > 0 ? (wtNum * rateNum).toFixed(2) : '';
        }
      }

      return updated;
    });
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      showToast(`Processing ${files.length} photo(s)...`, 'info');
      const compressedDataUrls = await Promise.all(
        files.map((file) => compressImageFile(file, 1200, 0.8))
      );

      setImages((prev) => [...prev, ...compressedDataUrls]);
      setImageError(false);
      showToast('Photos added successfully!', 'success');
    } catch (err) {
      console.error('Failed to process uploaded images:', err);
      showToast('Failed to process image file', 'error');
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSetPrimaryImage = (indexToMakePrimary) => {
    setImages((prev) => {
      const copy = [...prev];
      const target = copy.splice(indexToMakePrimary, 1)[0];
      return [target, ...copy];
    });
    showToast('Main thumbnail updated', 'info');
  };

  const handleOpenMasterModal = (type) => {
    setCrudModalType(type);
    setShowCrudModal(true);
  };

  // Step 1 -> Step 2 transition
  const handlePage6Next = (e) => {
    e.preventDefault();

    const grossWtNum = parseFloat(formData.gross_wt) || 0;
    if (grossWtNum <= 0) {
      showToast('Gross weight is required and must be greater than 0', 'error');
      return;
    }

    const netWtNum = parseFloat(formData.net_wt) || parseFloat(formData.gross_wt) || 0;
    const pureWtNum = parseFloat(formData.pure_weight) || 0;
    const goldRate = parseFloat(formData.purchase_rate) || 0;
    const goldPurchaseVal = goldRate > 0 && netWtNum > 0 ? (netWtNum * goldRate) : 0;

    const mainRecord = {
      category_id: activeCategory?.id,
      subcategory_id: activeSubcategory?.id,
      category_name: activeCategory?.name || 'Gold',
      subcategory_name: activeSubcategory?.name || 'Main Product',
      item_code: formData.item_code,
      design_no: formData.design_no,
      stock_qty: parseInt(formData.stock_qty) || 1,
      item_name: formData.item_name || activeSubcategory?.name || activeCategory?.name || 'Main Product',
      karat: formData.karat,
      purity: formData.purity,
      gross_wt: parseFloat(formData.gross_wt) || 0,
      net_wt: netWtNum,
      pure_weight: pureWtNum,
      purchase_rate: goldRate,
      purchase_value: goldPurchaseVal,
      stamp: formData.stamp,
      unit: formData.unit,
      size: formData.size,
      no_of_pieces: formData.no_of_pieces,
      vendor: formData.vendor,
      vendor_name: formData.vendor_name || formData.vendor,
      vendor_id: formData.vendor_id,
      quality: formData.quality,
      images: [...images],
      thumb_image: images[0] || '',
    };

    setMainProductData(mainRecord);
    setPageStep(7);
    setImageError(false);

    const diaCat = categoriesList.find((c) => isDiamondOrStoneCat(c.name)) || categoriesList[0] || activeCategory;
    if (diaCat) {
      setActiveCategory(diaCat);
      setActiveSubcategory(diaCat.subcategories?.[0] || null);
    }

    setFormData({
      item_code: generateCode(diaCat),
      item_name: diaCat?.name || 'Diamond Component',
      karat: '18K',
      purity: '75.0',
      gross_wt: '',
      net_wt: '',
      pure_weight: '',
      stone_weight: '',
      stamp: '',
      unit: 'Carats',
      size: '0.00',
      no_of_pieces: '1',
      description: '',
      purchase_rate: '',
      purchase_value: '',
    });

    showToast('Main gold product saved! Now add component details.', 'info');
  };

  const handleEditMainGoldItem = () => {
    setPageStep(6);
    if (mainProductData) {
      setActiveCategory(categoriesList.find((c) => String(c.id) === String(mainProductData.category_id)) || primaryCategory);
      setFormData({
        item_code: mainProductData.item_code || '',
        item_name: mainProductData.item_name || '',
        karat: mainProductData.karat || '22K',
        purity: mainProductData.purity || '91.6',
        gross_wt: mainProductData.gross_wt || '',
        net_wt: mainProductData.net_wt || '',
        pure_weight: mainProductData.pure_weight || '',
        purchase_rate: mainProductData.purchase_rate || '',
        purchase_value: mainProductData.purchase_value || '',
        stamp: mainProductData.stamp || '',
        unit: mainProductData.unit || (unitsList.length > 0 ? unitsList[0].name : 'Grams'),
        size: mainProductData.size || '0.00',
        no_of_pieces: mainProductData.no_of_pieces || '1',
        vendor: mainProductData.vendor || '',
        vendor_name: mainProductData.vendor_name || '',
        vendor_id: mainProductData.vendor_id || '',
        quality: mainProductData.quality || '',
        description: mainProductData.description || '',
      });
      if (mainProductData.images && mainProductData.images.length > 0) {
        setImages(mainProductData.images);
      }
    }
    showToast('Editing Main Gold Item', 'info');
  };

  const handleAddComponent = (e) => {
    e.preventDefault();

    const isDiaOrStone = isDiamondOrStoneCat(activeCategory?.name);
    const weightVal = isDiaOrStone
      ? (parseFloat(formData.stone_weight || formData.gross_wt) || 0)
      : (parseFloat(formData.gross_wt) || 0);

    const catName = activeCategory?.name || formData.item_name || 'Component';
    const compName = catName;
    const catLower = catName.toLowerCase().trim();
    const isDia = catLower.includes('diamond') || catLower.includes('solitaire') || /\bdia\b/.test(catLower);
    const isStn = !isDia && (catLower.includes('stone') || catLower.includes('gem') || catLower.includes('pearl') || catLower.includes('cz') || catLower.includes('ruby') || catLower.includes('emerald') || catLower.includes('sapphire') || catLower.includes('colour'));

    const compType = isDia ? 'Diamond' : (isStn ? 'Stone' : (isDiaOrStone ? 'Diamond' : 'Metal'));
    const compRate = parseFloat(formData.purchase_rate) || 0;
    const compPurchaseVal = compRate > 0 && weightVal > 0 ? (weightVal * compRate) : (parseFloat(formData.purchase_value) || 0);

    const weightUnit = isDiaOrStone ? (formData.unit || 'Carats') : (formData.unit || 'g');

    const componentPayload = {
      id_temp: editingComponentTempId || Date.now() + Math.random(),
      component_type: compType,
      is_diamond: isDia,
      is_stone: isStn,
      category_id: activeCategory?.id,
      subcategory_id: activeSubcategory?.id,
      category_name: activeCategory?.name || (isDia ? 'Diamond' : (isStn ? 'Colour Stone' : 'Component Category')),
      subcategory_name: activeSubcategory?.name || 'Subcategory',
      item_code: formData.item_code,
      item_name: compName,
      karat: formData.karat,
      purity: formData.purity,
      gross_wt: isDiaOrStone ? weightVal : (parseFloat(formData.gross_wt) || 0),
      net_wt: isDiaOrStone ? weightVal : (parseFloat(formData.net_wt) || parseFloat(formData.gross_wt) || 0),
      pure_weight: isDiaOrStone ? 0 : (parseFloat(formData.pure_weight) || 0),
      stone_weight: isDiaOrStone ? weightVal : 0,
      purchase_rate: compRate,
      purchase_value: compPurchaseVal,
      stamp: formData.stamp,
      unit: weightUnit,
      size: formData.size,
      no_of_pieces: formData.no_of_pieces,
      images: [...images],
      thumb_image: images[0] || '',
    };

    if (editingComponentTempId) {
      setAddedComponents((prev) =>
        prev.map((c) => (c.id_temp === editingComponentTempId ? componentPayload : c))
      );
      setEditingComponentTempId(null);
      showToast(`Updated component "${componentPayload.item_name}"!`, 'success');
    } else {
      setAddedComponents((prev) => [...prev, componentPayload]);
      showToast(`Added component "${componentPayload.item_name}"!`, 'success');
    }

    const defaultCode = generateCode(activeCategory);

    setFormData({
      item_code: defaultCode,
      item_name: activeCategory?.name || 'Component',
      karat: '18K',
      purity: '75.0',
      gross_wt: '',
      net_wt: '',
      pure_weight: '',
      stone_weight: '',
      purchase_rate: '',
      purchase_value: '',
      stamp: '',
      unit: isDiaOrStone ? 'Carats' : 'g',
      size: '0.00',
      no_of_pieces: '1',
      description: '',
    });
  };

  const handleEditComponent = (comp) => {
    setEditingComponentTempId(comp.id_temp);
    const catObj = categoriesList.find((c) => String(c.id) === String(comp.category_id)) || activeCategory;
    if (catObj) {
      setActiveCategory(catObj);
      setActiveSubcategory(catObj.subcategories?.find((s) => String(s.id) === String(comp.subcategory_id)) || null);
    }

    setFormData({
      item_code: comp.item_code || '',
      item_name: comp.category_name || comp.item_name || '',
      karat: comp.karat || '18K',
      purity: comp.purity || '75.0',
      gross_wt: comp.gross_wt || '',
      net_wt: comp.net_wt || '',
      pure_weight: comp.pure_weight || '',
      stone_weight: comp.stone_weight || comp.gross_wt || '',
      purchase_rate: comp.purchase_rate || '',
      purchase_value: comp.purchase_value || '',
      stamp: comp.stamp || '',
      unit: comp.unit || 'g',
      size: comp.size || '0.00',
      no_of_pieces: comp.no_of_pieces || '1',
      description: comp.description || '',
    });
    showToast(`Editing component "${comp.category_name || comp.item_name}"`, 'info');
  };

  const handleRemoveComponent = (tempId) => {
    setAddedComponents((prev) => prev.filter((c) => c.id_temp !== tempId));
    if (editingComponentTempId === tempId) {
      setEditingComponentTempId(null);
    }
    showToast('Component removed', 'info');
  };

  // Final Product Save & Upload to Inventory API
  const handleUploadProductToInventory = async () => {
    if (isSubmitting) return;

    const defaultCode = generateCode(activeCategory || primaryCategory);

    let primaryComp = mainProductData;

    if (!primaryComp) {
      if (addedComponents.length > 0) {
        primaryComp = addedComponents[0];
      } else {
        const netWtNum = parseFloat(formData.net_wt) || parseFloat(formData.gross_wt) || 0;
        const rateNum = parseFloat(formData.purchase_rate) || 0;
        primaryComp = {
          category_id: activeCategory?.id || primaryCategory?.id,
          subcategory_id: activeSubcategory?.id || primarySubcategory?.id,
          category_name: activeCategory?.name || primaryCategory?.name || 'Category',
          subcategory_name: activeSubcategory?.name || primarySubcategory?.name || 'Subcategory',
          item_code: formData.item_code || defaultCode,
          item_name: formData.item_name || activeSubcategory?.name || activeCategory?.name || 'Main Product',
          karat: formData.karat || '22K',
          purity: formData.purity || '91.6',
          gross_wt: parseFloat(formData.gross_wt) || 0,
          net_wt: netWtNum,
          pure_weight: parseFloat(formData.pure_weight) || 0,
          purchase_rate: rateNum,
          purchase_value: rateNum > 0 && netWtNum > 0 ? (netWtNum * rateNum) : 0,
          vendor: formData.vendor,
          vendor_name: formData.vendor_name || formData.vendor,
          vendor_id: formData.vendor_id,
          quality: formData.quality,
          thumb_image: images[0] || '',
          images: [...images],
        };
      }
    }

    // Client-side validations
    const grossWt = parseFloat(primaryComp.gross_wt) || 0;
    if (grossWt <= 0) {
      showToast('Gross weight is required and must be greater than 0', 'error');
      return;
    }

    const targetCatId = primaryCategory?.id || primaryComp.category_id;
    if (!targetCatId) {
      showToast('Please select a valid Category before uploading', 'error');
      return;
    }

    let extraComponents = mainProductData
      ? [...addedComponents]
      : (addedComponents.length > 0 ? addedComponents.slice(1) : []);

    // If on Step 2 and user filled component fields without clicking "Add New Item", automatically include it
    if (pageStep === 7) {
      const pendingWt = parseFloat(formData.stone_weight || formData.gross_wt) || 0;
      const pendingPieces = parseInt(formData.no_of_pieces, 10) || 0;
      const pendingRate = parseFloat(formData.purchase_rate) || 0;
      const hasPendingData = pendingWt > 0 || pendingPieces > 0 || pendingRate > 0;

      const alreadyInList = editingComponentTempId
        ? extraComponents.some((c) => c.id_temp === editingComponentTempId)
        : false;

      if (hasPendingData && !alreadyInList) {
        const catName = activeCategory?.name || formData.item_name || 'Component';
        const isDiaOrStone = isDiamondOrStoneCat(catName);
        const catLower = catName.toLowerCase().trim();
        const isDia = catLower.includes('diamond') || catLower.includes('solitaire') || /\bdia\b/.test(catLower);
        const isStn = !isDia && (catLower.includes('stone') || catLower.includes('gem') || catLower.includes('pearl') || catLower.includes('cz') || catLower.includes('ruby') || catLower.includes('emerald') || catLower.includes('sapphire') || catLower.includes('colour'));
        const compType = isDia ? 'Diamond' : (isStn ? 'Stone' : (isDiaOrStone ? 'Diamond' : 'Metal'));
        const compVal = pendingRate > 0 && pendingWt > 0 ? (pendingWt * pendingRate) : (parseFloat(formData.purchase_value) || 0);

        const autoComp = {
          id_temp: Date.now() + Math.random(),
          component_type: compType,
          is_diamond: isDia,
          is_stone: isStn,
          category_id: activeCategory?.id,
          subcategory_id: activeSubcategory?.id,
          category_name: activeCategory?.name || (isDia ? 'Diamond' : (isStn ? 'Colour Stone' : 'Component')),
          subcategory_name: activeSubcategory?.name || 'Subcategory',
          item_code: formData.item_code,
          item_name: catName,
          karat: formData.karat,
          purity: formData.purity,
          gross_wt: isDiaOrStone ? pendingWt : (parseFloat(formData.gross_wt) || 0),
          net_wt: isDiaOrStone ? pendingWt : (parseFloat(formData.net_wt) || pendingWt),
          pure_weight: 0,
          stone_weight: isDiaOrStone ? pendingWt : 0,
          purchase_rate: pendingRate,
          purchase_value: compVal,
          stamp: formData.stamp,
          unit: isDiaOrStone ? (formData.unit || 'Carats') : (formData.unit || 'g'),
          size: formData.size,
          no_of_pieces: pendingPieces || 1,
          images: [...images],
          thumb_image: images[0] || '',
        };
        extraComponents.push(autoComp);
      }
    }

    const allComponents = [primaryComp, ...extraComponents];

    const catCodeStr = (primaryCategory?.code || primaryComp.category_name || 'PRD').replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase();
    const subCodeStr = (primarySubcategory?.code || primaryComp.subcategory_name || 'GEN').replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase();
    const generatedSku = `SKU-${catCodeStr}-${subCodeStr}-${Math.floor(1000 + Math.random() * 9000)}`;

    const cleanName = primaryComp.item_name && primaryComp.item_name.toLowerCase() !== 'main product'
      ? primaryComp.item_name
      : `${primaryCategory?.name || primaryComp.category_name || 'Jewelry'} - ${primarySubcategory?.name || primaryComp.subcategory_name || 'Product'}`;

    // Calculate detailed valuation breakdowns and convert component carats to grams (1 ct = 0.2 g)
    const primaryGross = parseFloat(primaryComp.gross_wt) || 0;

    let totalDiaVal = 0;
    let totalStoneVal = 0;
    let totalDiaWt = 0;
    let totalStoneWt = 0;
    let diaGrams = 0;
    let stoneGrams = 0;

    extraComponents.forEach((c) => {
      const cName = (c.category_name || c.item_name || c.component_type || '').toLowerCase();
      const isDia = c.is_diamond || isDiamondComponent(c) || cName.includes('diamond') || cName.includes('solitaire') || /\bdia\b/.test(cName);
      const isStn = !isDia && (c.is_stone || cName.includes('stone') || cName.includes('gem') || cName.includes('pearl') || cName.includes('cz') || cName.includes('ruby') || cName.includes('emerald') || cName.includes('sapphire') || cName.includes('colour'));
      const wt = parseFloat(c.stone_weight || c.gross_wt) || 0;
      const rate = parseFloat(c.purchase_rate) || 0;
      const val = c.purchase_value !== undefined && c.purchase_value !== null && c.purchase_value !== '' ? parseFloat(c.purchase_value) : (wt * rate);
      if (isDia) {
        totalDiaWt += wt;
        totalDiaVal += val;
        diaGrams += wt * 0.2; // 1 ct = 0.2 g
      } else if (isStn) {
        totalStoneWt += wt;
        totalStoneVal += val;
        const u = String(c.unit || '').toLowerCase();
        stoneGrams += (u === 'g' || u === 'gm' || u === 'grams') ? wt : (wt * 0.2);
      }
    });

    const totalNonMetalGrams = Number((diaGrams + stoneGrams).toFixed(3));
    const finalNetGold = primaryGross > totalNonMetalGrams && totalNonMetalGrams > 0
      ? Number((primaryGross - totalNonMetalGrams).toFixed(3))
      : (parseFloat(primaryComp.net_wt) || primaryGross);

    const goldRate = parseFloat(primaryComp.purchase_rate) || 0;
    const goldVal = primaryComp.purchase_value && (!totalNonMetalGrams || parseFloat(primaryComp.net_wt) === finalNetGold)
      ? parseFloat(primaryComp.purchase_value)
      : (finalNetGold * goldRate);

    // Update primaryComp to reflect the true net gold weight and gold purchase value
    primaryComp.gross_wt = primaryGross;
    primaryComp.net_wt = finalNetGold;
    const purityPct = parseFloat(primaryComp.purity) || 91.6;
    primaryComp.pure_weight = Number((finalNetGold * (purityPct / 100)).toFixed(3));
    primaryComp.purchase_value = goldVal;

    const overallPurchaseVal = goldVal + totalDiaVal + totalStoneVal;

    const diaCompFound = extraComponents.find((c) => c.is_diamond || isDiamondComponent(c) || (c.category_name || c.item_name || '').toLowerCase().includes('diamond'));

    const productRecord = {
      category_id: targetCatId,
      subcategory_id: primarySubcategory?.id || primaryComp.subcategory_id || null,
      category_name: primaryCategory?.name || primaryComp.category_name,
      subcategory_name: primarySubcategory?.name || primaryComp.subcategory_name,
      product_code: primaryComp.item_code || defaultCode,
      design_no: mainProductData?.design_no || formData.design_no || null,
      stock_qty: parseInt(mainProductData?.stock_qty || formData.stock_qty || 1, 10),
      quantity: parseInt(mainProductData?.stock_qty || formData.stock_qty || 1, 10),
      no_of_pieces: parseInt(mainProductData?.stock_qty || formData.stock_qty || 1, 10),
      sku: generatedSku,
      name: cleanName,
      gross_wt: primaryComp.gross_wt,
      net_wt: primaryComp.net_wt,
      pure_weight: primaryComp.pure_weight,
      purity: primaryComp.purity,
      karat: primaryComp.karat,
      stamp: primaryComp.stamp,
      unit: primaryComp.unit,
      purchase_rate: goldRate,
      gold_purchase_rate: goldRate,
      gold_purchase_value: goldVal,
      diamond_purchase_rate: diaCompFound ? (parseFloat(diaCompFound.purchase_rate) || 0) : (parseFloat(formData.purchase_rate) || 0),
      diamond_purchase_value: totalDiaVal,
      stone_purchase_rate: extraComponents.find((c) => c.is_stone) ? (parseFloat(extraComponents.find((c) => c.is_stone).purchase_rate) || 0) : 0,
      stone_purchase_value: totalStoneVal,
      total_purchase_value: overallPurchaseVal,
      vendor: primaryComp.vendor || formData.vendor,
      vendor_name: primaryComp.vendor_name || formData.vendor_name || formData.vendor,
      vendor_id: primaryComp.vendor_id || formData.vendor_id,
      quality: primaryComp.quality || formData.quality,
      thumb_image: primaryComp.thumb_image || images[0] || '',
      image: primaryComp.thumb_image || images[0] || '',
      images: primaryComp.images && primaryComp.images.length > 0 ? primaryComp.images : images,
      components: allComponents,
      diamond_stamp: diaCompFound?.stamp && !isMetalPurityStamp(diaCompFound.stamp) ? diaCompFound.stamp : null,
      dia_wt_ct: totalDiaWt > 0 ? totalDiaWt.toFixed(3) : (diaCompFound ? parseFloat(diaCompFound.stone_weight || diaCompFound.gross_wt || 0).toFixed(3) : null),
      diamond_count: diaCompFound ? parseInt(diaCompFound.no_of_pieces || 1, 10) : null,
    };

    try {
      setIsSubmitting(true);
      const res = await api.post('/inventory', {
        items: [productRecord],
      });

      const savedProducts = res.data?.products || [productRecord];

      // Ensure savedProducts retains the full components breakdown for immediate display
      if (Array.isArray(savedProducts) && savedProducts.length > 0) {
        if (!savedProducts[0].components || savedProducts[0].components.length === 0) {
          savedProducts[0].components = allComponents;
        }
        if (savedProducts[0].attributes && (!savedProducts[0].attributes.components || savedProducts[0].attributes.components.length === 0)) {
          savedProducts[0].attributes.components = allComponents;
        }
      }

      try {
        sessionStorage.setItem('inventory_last_uploaded_items', JSON.stringify(savedProducts));
        sessionStorage.removeItem('inventory_selected_category');
        sessionStorage.removeItem('inventory_selected_subcategory');
      } catch (storageErr) {
        console.warn('SessionStorage quota bypass:', storageErr);
      }

      showToast(res.data?.message || 'Product uploaded successfully to inventory!', 'success');
      navigate('/inventory/add-new/complete');
    } catch (err) {
      console.error('Failed to save product to inventory', err);
      let msg = err.response?.data?.message || err.message || 'Failed to upload product';
      if (err.response?.data?.errors && typeof err.response.data.errors === 'object') {
        const errorEntries = Object.entries(err.response.data.errors);
        if (errorEntries.length > 0) {
          const [field, fieldErrors] = errorEntries[0];
          const errorText = Array.isArray(fieldErrors) ? fieldErrors[0] : fieldErrors;
          msg = `${field.replace('_', ' ').toUpperCase()}: ${errorText}`;
        }
      }
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderMultiImageUploader = () => (
    <div className="space-y-3">
      <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
        PRODUCT MEDIA
      </span>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      <div
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl overflow-hidden text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[260px] group ${imageError
          ? 'border-red-500 bg-red-50/70 ring-2 ring-red-200'
          : 'border-[#e6c5c5] hover:border-[#b01622] bg-[#f7f0f0] hover:bg-[#f2e6e6]'
          }`}
      >
        {images.length > 0 ? (
          <div className="relative w-full h-[260px] bg-stone-900 flex items-center justify-center">
            <img
              src={images[0]}
              alt="Primary Thumbnail"
              className="w-full h-full object-contain"
            />
            <div className="absolute top-2 left-2 bg-[#b01622] text-white text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider shadow-md">
              Primary Thumbnail
            </div>
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 text-white p-4">
              <span className="text-xs font-bold">+ Click to Add More Photos</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="px-4 py-1.5 bg-white text-[#b01622] hover:bg-stone-100 rounded-full text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                Browse Files
              </button>
            </div>
          </div>
        ) : (
          <div className="p-8 flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl mb-3 text-[#b01622]">
              <i className="fa-solid fa-camera"></i>
            </div>

            <h4 className="text-sm font-bold text-gray-900 tracking-tight">
              Drag &amp; Drop Product Images
            </h4>

            <p className="text-[11px] text-stone-400 mt-1 mb-4">
              Support JPG, PNG, or TIFF. Max 10MB per file.
            </p>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="px-6 py-2 bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 rounded-full text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              Browse Files
            </button>
          </div>
        )}
      </div>

      {imageError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2">
          <i className="fa-solid fa-circle-exclamation text-sm text-red-600"></i>
          <span>At least one image is required before proceeding.</span>
        </div>
      )}

      {images.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-700 block">
              Uploaded Images ({images.length})
            </span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[11px] font-bold text-[#b01622] hover:underline"
            >
              + Add Child Image
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {images.map((img, idx) => (
              <div
                key={idx}
                className={`relative group rounded-xl overflow-hidden border-2 aspect-square bg-stone-900 shadow-2xs ${idx === 0 ? 'border-[#b01622] ring-2 ring-red-100' : 'border-stone-200'
                  }`}
              >
                <img src={img} alt={`Image ${idx + 1}`} className="w-full h-full object-cover" />
                {idx === 0 && (
                  <span className="absolute top-1 left-1 bg-[#b01622] text-white text-[7px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                    Main
                  </span>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 p-1">
                  {idx !== 0 && (
                    <button
                      type="button"
                      onClick={() => handleSetPrimaryImage(idx)}
                      className="w-6 h-6 rounded-md bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center text-[9px] cursor-pointer"
                      title="Set as Main Thumbnail"
                    >
                      <i className="fa-solid fa-star"></i>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="w-6 h-6 rounded-md bg-red-600 hover:bg-red-700 text-white flex items-center justify-center text-[9px] cursor-pointer"
                    title="Remove Image"
                  >
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              </div>
            ))}

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#e6c5c5] hover:border-[#b01622] bg-[#f7f0f0] rounded-xl flex flex-col items-center justify-center aspect-square cursor-pointer transition-colors text-stone-500 hover:text-[#b01622]"
              title="Add More Photos"
            >
              <i className="fa-solid fa-plus text-sm mb-0.5"></i>
              <span className="text-[9px] font-bold">Add</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full pb-20 space-y-6 font-['Inter',-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif] max-w-5xl mx-auto pt-2">

      {/* Stepper Header */}
      <div className="flex items-center justify-center pt-2 pb-4">
        <div className="flex items-center gap-4 sm:gap-12">

          {/* Step 1 */}
          <div className="flex flex-col items-center">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shadow-2xs ${pageStep >= 6 ? 'bg-[#b01622] text-white' : 'bg-stone-200 text-stone-600'
              }`}>
              1
            </div>
            <span className={`text-xs font-bold mt-2 ${pageStep >= 6 ? 'text-[#b01622]' : 'text-stone-500'}`}>
              {isSilverCategory ? 'Main Silver Item' : 'Main Gold Item'}
            </span>
          </div>

          <div className={`w-16 sm:w-32 h-0.5 -mt-5 ${pageStep >= 7 ? 'bg-[#b01622]' : 'bg-stone-300'}`}></div>

          {/* Step 2 */}
          <div className="flex flex-col items-center">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shadow-2xs ${pageStep >= 7 ? 'bg-[#b01622] text-white' : 'bg-stone-200 text-stone-600'
              }`}>
              2
            </div>
            <span className={`text-xs font-bold mt-2 ${pageStep >= 7 ? 'text-[#b01622]' : 'text-stone-500'}`}>
              Component Entry
            </span>
          </div>

          <div className="w-16 sm:w-32 h-0.5 bg-stone-300 -mt-5"></div>

          {/* Step 3 */}
          <div className="flex flex-col items-center">
            <div className="w-9 h-9 rounded-full bg-stone-200 text-stone-600 flex items-center justify-center text-sm font-bold shadow-2xs">
              3
            </div>
            <span className="text-xs font-bold text-stone-500 mt-2">Complete</span>
          </div>

        </div>
      </div>

      {/* STEP 2 TOP SUMMARY TABLE & EDITING CONTROLS */}
      {pageStep === 7 && (
        <div className="space-y-4 mb-6">

          <div className="bg-white rounded-3xl border border-stone-200/90 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f8f9fa] text-stone-800 font-bold text-center text-xs border-b border-stone-200">
                    <th className="py-4 px-3 text-center w-12">S.No</th>
                    <th className="py-4 px-4 text-center">Product Image</th>
                    <th className="py-4 px-4 text-center">Category</th>
                    <th className="py-4 px-4 text-center">Stamp</th>
                    <th className="py-4 px-4 text-center">Unit</th>
                    <th className="py-4 px-4 text-center">Pieces</th>
                    <th className="py-4 px-4 text-center">Weight</th>
                    <th className="py-4 px-4 text-center">Rate</th>
                    <th className="py-4 px-4 text-center">Purchase Value</th>
                    <th className="py-4 px-4 text-center w-28">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 bg-white">
                  {/* Row 1: Main Product Details */}
                  {mainProductData && (
                    <tr className="hover:bg-stone-50/80 transition-colors text-center text-xs font-medium">
                      <td className="py-3 px-3 text-center font-mono text-stone-400 font-medium">
                        1
                      </td>
                      <td className="py-3 px-4 text-center">
                        {images && images.length > 0 ? (
                          <img
                            src={images[0]}
                            alt="Main Product"
                            className="w-11 h-11 object-cover rounded-xl border border-stone-200 mx-auto shadow-2xs"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center font-bold text-xs mx-auto shadow-2xs">
                            <i className="fa-solid fa-gem"></i>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center text-gray-900 font-bold text-xs">
                        {mainProductData.item_name || (isSilverCategory ? 'Silver Item' : 'Gold Item')}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-stone-700">
                        {mainProductData.stamp || (isSilverCategory ? '925' : '-')}
                      </td>
                      <td className="py-3 px-4 text-center text-stone-600 font-bold">
                        {mainProductData.unit || 'Grams'}
                      </td>
                      <td className="py-3 px-4 text-center font-black text-gray-900 text-xs">
                        {mainProductData.no_of_pieces || 1}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-gray-900">
                        {parseFloat(mainProductData.pure_weight || mainProductData.gross_wt || 0).toFixed(3)} {mainProductData.unit?.toLowerCase().includes('ct') || mainProductData.unit?.toLowerCase().includes('carat') ? 'ct' : (mainProductData.unit || 'g')}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-stone-700">
                        {parseFloat(mainProductData.purchase_rate || 0) > 0 ? `₹${parseFloat(mainProductData.purchase_rate).toLocaleString('en-IN')}/g` : '—'}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-[#b01622]">
                        {parseFloat(mainProductData.purchase_value || 0) > 0 ? `₹${parseFloat(mainProductData.purchase_value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={handleEditMainGoldItem}
                          className="w-8 h-8 rounded-xl bg-amber-50 hover:bg-amber-100 text-[#b01622] border border-amber-200 flex items-center justify-center transition-colors cursor-pointer mx-auto"
                          title="Edit Main Product Details"
                        >
                          <i className="fa-solid fa-pen-to-square text-xs"></i>
                        </button>
                      </td>
                    </tr>
                  )}

                  {/* Component Rows */}
                  {addedComponents.map((comp, idx) => {
                    const weightVal = parseFloat(comp.stone_weight || comp.gross_wt || 0).toFixed(3);
                    const compSNo = mainProductData ? idx + 2 : idx + 1;
                    const isCt = comp.unit?.toLowerCase().includes('ct') || comp.unit?.toLowerCase().includes('carat');

                    return (
                      <tr
                        key={comp.id_temp || idx}
                        className={`hover:bg-stone-50/80 transition-colors text-center text-xs font-medium ${
                          editingComponentTempId === comp.id_temp ? 'bg-amber-50/70 ring-1 ring-amber-300' : ''
                        }`}
                      >
                        <td className="py-3 px-3 text-center font-mono text-stone-400 font-medium">
                          {compSNo}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {images && images.length > 0 ? (
                            <img
                              src={images[0]}
                              alt="Component"
                              className="w-11 h-11 object-cover rounded-xl border border-stone-200 mx-auto shadow-2xs"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-stone-100 text-stone-700 border border-stone-200 flex items-center justify-center font-bold text-xs mx-auto shadow-2xs">
                              <i className="fa-regular fa-gem"></i>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center text-gray-900 font-semibold">
                          {comp.category_name || comp.item_name}
                        </td>
                        <td className="py-3 px-4 text-center text-stone-700 font-semibold">
                          {comp.stamp || '-'}
                        </td>
                        <td className="py-3 px-4 text-center text-stone-600 font-bold">
                          {comp.unit || 'Grams'}
                        </td>
                        <td className="py-3 px-4 text-center font-black text-gray-900 text-xs">
                          {comp.no_of_pieces || 1}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-gray-900">
                          {weightVal} {isCt ? 'ct' : (comp.unit || 'g')}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-semibold text-stone-700">
                          {parseFloat(comp.purchase_rate || 0) > 0 ? `₹${parseFloat(comp.purchase_rate).toLocaleString('en-IN')}/${isCt ? 'ct' : 'g'}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-[#b01622]">
                          {parseFloat(comp.purchase_value || 0) > 0 ? `₹${parseFloat(comp.purchase_value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleEditComponent(comp)}
                              className="w-8 h-8 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 flex items-center justify-center transition-colors cursor-pointer"
                              title="Edit Component Details"
                            >
                              <i className="fa-solid fa-pen-to-square text-xs"></i>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveComponent(comp.id_temp)}
                              className="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 flex items-center justify-center transition-colors cursor-pointer"
                              title="Remove Component"
                            >
                              <i className="fa-solid fa-trash-can text-xs"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>


        </div>
      )}

      {/* MAIN FORM CARD */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm overflow-hidden">

        {/* Header Banner */}
        <div className="bg-[#b01622] text-white px-8 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              {pageStep === 6
                ? (isSilverCategory ? 'Step 1: Main Silver Product Details' : 'Step 1: Main Gold Product Details')
                : 'Step 2: Component Entry'}
            </h2>
            <p className="text-xs text-red-100 font-normal mt-0.5">
              {pageStep === 6
                ? (isSilverCategory
                    ? 'Enter primary silver specs, fine silver weight, vendor, and product media.'
                    : 'Enter primary product specs, purity, weight details, vendor, and product media.')
                : 'Add diamond or stone details with unit-based weight specifications.'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center text-white text-xl">
            <i className="fa-solid fa-cloud-arrow-up"></i>
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={pageStep === 6 ? handlePage6Next : handleAddComponent} className="p-8 bg-white space-y-6">

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* Left Column: Product Media Upload */}
            <div className="lg:col-span-5">
              {renderMultiImageUploader()}
            </div>

            {/* Right Column: Form Inputs */}
            <div className="lg:col-span-7 space-y-5">

              {pageStep === 6 ? (
                <>
                  {/* STEP 1 FIELDS: MAIN GOLD PRODUCT DETAILS */}

                  {/* Row 1: ITEM NAME, PRODUCT SKU, DESIGN NO, & STOCK QUANTITY */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider">
                          ITEM NAME
                        </label>
                        <button
                          type="button"
                          onClick={() => handleOpenMasterModal('item')}
                          className="text-[10px] text-[#b01622] font-bold hover:underline cursor-pointer"
                        >
                          + CRUD
                        </button>
                      </div>
                      <select
                        name="item_name"
                        value={formData.item_name}
                        onChange={(e) => {
                          handleInputChange(e);
                          const found = itemsMasterList.find((i) => i.name === e.target.value);
                          if (found) setSelectedItemMasterId(found.id);
                        }}
                        className="w-full p-3 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622] cursor-pointer"
                      >
                        <option value="">-- Select Item Name --</option>
                        {itemsMasterList.length > 0 ? (
                          itemsMasterList.map((itm) => (
                            <option key={itm.id} value={itm.name}>
                              {itm.name} {itm.code ? `[${itm.code}]` : ''}
                            </option>
                          ))
                        ) : (
                          <>
                            <option value={formData.item_name || activeSubcategory?.name || 'Gold Stud'}>
                              {formData.item_name || activeSubcategory?.name || 'Gold Stud'}
                            </option>
                            <option value="Box Link Chain">Box Link Chain</option>
                            <option value="Antique Temple Necklace">Antique Temple Necklace</option>
                            <option value="Solitaire Diamond Ring">Solitaire Diamond Ring</option>
                            <option value="Kada Bangles Pair">Kada Bangles Pair</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                        PRODUCT SKU
                      </label>
                      <input
                        type="text"
                        name="item_code"
                        value={formData.item_code}
                        onChange={handleInputChange}
                        placeholder="RJ-G-18294"
                        className="w-full p-3 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                        DESIGN NO.
                      </label>
                      <input
                        type="text"
                        name="design_no"
                        value={formData.design_no}
                        onChange={handleInputChange}
                        placeholder="RJ-DES-001"
                        className="w-full p-3 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#b01622] uppercase tracking-wider mb-1">
                        STOCK QUANTITY
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        name="stock_qty"
                        value={formData.stock_qty}
                        onChange={handleInputChange}
                        placeholder="1"
                        className="w-full p-3 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-mono font-black text-[#b01622] focus:outline-none focus:bg-white focus:border-[#b01622]"
                        required
                      />
                    </div>
                  </div>

                  {/* Row 2: KARAT/GRADE, STAMP, PURITY (%), SIZE, NO. OF PIECES */}
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider">
                          {isSilverCategory ? 'SILVER GRADE' : 'KARAT'}
                        </label>
                        <button
                          type="button"
                          onClick={() => handleOpenMasterModal('karat')}
                          className="text-[10px] text-[#b01622] font-bold hover:underline"
                        >
                          + CRUD
                        </button>
                      </div>
                      <select
                        name="karat"
                        value={formData.karat}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData((prev) => {
                            const updated = { ...prev, karat: val };
                            if (isSilverCategory) {
                              if (val.includes('999')) updated.purity = '99.9';
                              else if (val.includes('925')) updated.purity = '92.5';
                              else if (val.includes('900')) updated.purity = '90.0';
                              else if (val.includes('800')) updated.purity = '80.0';
                            }
                            return updated;
                          });
                          handleInputChange(e);
                        }}
                        className="w-full p-3 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622] cursor-pointer"
                      >
                        {isSilverCategory ? (
                          <>
                            <option value="925 Silver">925 Sterling Silver (92.5%)</option>
                            <option value="999 Fine Silver">999 Fine Silver (99.9%)</option>
                            <option value="900 Silver">900 Silver (90.0%)</option>
                            <option value="800 Silver">800 Silver (80.0%)</option>
                          </>
                        ) : (
                          karatsList.map((k) => (
                            <option key={k.id} value={k.name}>
                              {k.name}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider">
                          STAMP
                        </label>
                        <button
                          type="button"
                          onClick={() => handleOpenMasterModal('stamp')}
                          className="text-[10px] text-[#b01622] font-bold hover:underline"
                        >
                          + CRUD
                        </button>
                      </div>
                      <select
                        name="stamp"
                        value={formData.stamp || ''}
                        onChange={handleInputChange}
                        className="w-full p-3 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622] cursor-pointer"
                      >
                        <option value="">-- Select Stamp --</option>
                        {getFilteredStamps(activeCategory?.name || primaryCategory?.name).map((st) => (
                          <option key={st.id} value={st.name}>
                            {st.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                        PURITY (%)
                      </label>
                      <input
                        type="text"
                        name="purity"
                        value={formData.purity}
                        onChange={handleInputChange}
                        placeholder={isSilverCategory ? '92.5' : '91.6'}
                        className="w-full p-3 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                        SIZE
                      </label>
                      <input
                        type="text"
                        name="size"
                        value={formData.size}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        className="w-full p-3 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                        NO. OF PIECES
                      </label>
                      <input
                        type="number"
                        name="no_of_pieces"
                        value={formData.no_of_pieces}
                        onChange={handleInputChange}
                        placeholder="1"
                        className="w-full p-3 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622]"
                      />
                    </div>
                  </div>

                  {/* Row 3: GROSS WEIGHT, NET SILVER/GOLD WEIGHT, FINE SILVER / PURE WEIGHT OF 24K */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                        GROSS WEIGHT (g)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        name="gross_wt"
                        value={formData.gross_wt}
                        onChange={handleInputChange}
                        placeholder="0.000g"
                        className="w-full p-3 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                        {isSilverCategory ? 'NET SILVER WEIGHT (g)' : 'NET GOLD WEIGHT (g)'}
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        name="net_wt"
                        value={formData.net_wt}
                        onChange={handleInputChange}
                        placeholder="0.000g"
                        className="w-full p-3 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#b01622] uppercase tracking-wider mb-1">
                        {isSilverCategory ? 'FINE SILVER WEIGHT' : 'FINE GOLD WEIGHT (PURE 24K)'}
                      </label>
                      <input
                        type="text"
                        name="pure_weight"
                        value={formData.pure_weight ? `${formData.pure_weight} g` : ''}
                        placeholder="0.000g"
                        className="w-full p-3 bg-stone-100 border border-stone-300 rounded-xl text-xs font-mono font-black text-[#b01622] focus:outline-none cursor-not-allowed"
                        readOnly
                      />
                    </div>
                  </div>

                  {/* Row 4: PURCHASE RATE PER GRAM & PURCHASE VALUE */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                        {isSilverCategory ? 'SILVER PURCHASE RATE (₹/g)' : 'PURCHASE RATE PER GRAM (₹/g)'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="purchase_rate"
                        value={formData.purchase_rate}
                        onChange={handleInputChange}
                        placeholder={isSilverCategory ? 'e.g. 216.50' : 'e.g. 6800.00'}
                        className="w-full p-3 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#b01622] uppercase tracking-wider mb-1">
                        {isSilverCategory ? 'SILVER PURCHASE VALUE (₹)' : 'GOLD PURCHASE VALUE (₹)'}
                      </label>
                      <input
                        type="text"
                        name="purchase_value"
                        value={formData.purchase_value ? `₹ ${parseFloat(formData.purchase_value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₹ 0.00'}
                        placeholder="₹ 0.00"
                        className="w-full p-3 bg-stone-100 border border-stone-300 rounded-xl text-xs font-mono font-black text-[#b01622] focus:outline-none cursor-not-allowed"
                        readOnly
                      />
                    </div>
                  </div>

                  {/* Row 5: VENDOR & QUALITY */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider">
                          VENDOR
                        </label>
                        <Link
                          to="/suppliers"
                          target="_blank"
                          className="text-[10px] text-[#b01622] font-bold hover:underline"
                        >
                          + SUPPLIERS
                        </Link>
                      </div>
                      <select
                        name="vendor"
                        value={formData.vendor}
                        onChange={(e) => {
                          const selectedVal = e.target.value;
                          const foundSup = suppliersList.find((s) => s.name === selectedVal || String(s.id) === selectedVal);
                          setFormData((prev) => ({
                            ...prev,
                            vendor: selectedVal,
                            vendor_name: foundSup ? foundSup.name : selectedVal,
                            vendor_id: foundSup ? foundSup.id : '',
                          }));
                        }}
                        className="w-full p-3 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622] cursor-pointer"
                      >
                        <option value="">-- Select Vendor --</option>
                        {suppliersList.length > 0 ? (
                          suppliersList.map((sup) => (
                            <option key={sup.id} value={sup.name}>
                              {sup.name} {sup.company_name ? `(${sup.company_name})` : sup.supplier_code ? `[${sup.supplier_code}]` : ''}
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="Kesav">Kesav (Kesav Ornaments)</option>
                            <option value="Suraj Karyekar">Suraj Karyekar (Mumbai Hub)</option>
                            <option value="Rajesh Varma">Rajesh Varma (Varma Filigree)</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                        QUALITY
                      </label>
                      <input
                        type="text"
                        name="quality"
                        value={formData.quality}
                        onChange={handleInputChange}
                        placeholder="e.g. VVS1 - E Color / 22K Hallmark"
                        className="w-full p-3 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622]"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* STEP 2 FIELDS: COMPONENT ENTRY */}

                  {/* Row 1: CATEGORY & STAMP ONLY (FILTERED FOR DIAMOND & STONE CATEGORIES ONLY) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider">
                          CATEGORY
                        </label>
                        <button
                          type="button"
                          onClick={() => handleOpenMasterModal('component_category')}
                          className="text-[10px] text-[#b01622] font-bold hover:underline"
                        >
                          + CRUD
                        </button>
                      </div>
                      <select
                        name="category_id"
                        value={activeCategory?.id || activeCategory?.name || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          let cat = componentCategoriesList.find((c) => String(c.id) === String(val) || c.name === val);
                          if (!cat) {
                            cat = categoriesList.find((c) => String(c.id) === String(val) || c.name === val);
                          }
                          if (!cat) {
                            cat = { id: val, name: val };
                          }
                          setActiveCategory(cat);
                          const filteredStamps = getFilteredStamps(cat.name);
                          const firstStamp = filteredStamps.length > 0 ? filteredStamps[0].name : '';
                          const isDiaOrStone = isDiamondOrStoneCat(cat.name);
                          setFormData((prev) => ({
                            ...prev,
                            item_name: cat.name,
                            item_code: generateCode(cat),
                            unit: isDiaOrStone ? 'Carats' : (unitsList[0]?.name || 'Grams'),
                            stamp: '',
                          }));
                        }}
                        className="w-full p-3 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622] cursor-pointer"
                      >
                        {(componentCategoriesList && componentCategoriesList.length > 0
                          ? componentCategoriesList
                          : (categoriesList.filter((c) => isDiamondOrStoneCat(c.name)).length > 0
                              ? categoriesList.filter((c) => isDiamondOrStoneCat(c.name))
                              : categoriesList
                            )
                        ).map((cat) => (
                          <option key={cat.id || cat.name} value={cat.id || cat.name}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider">
                          STAMP
                        </label>
                        <button
                          type="button"
                          onClick={() => handleOpenMasterModal('stamp')}
                          className="text-[10px] text-[#b01622] font-bold hover:underline"
                        >
                          + CRUD
                        </button>
                      </div>
                      <select
                        name="stamp"
                        value={formData.stamp || ''}
                        onChange={handleInputChange}
                        className="w-full p-3 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622] cursor-pointer"
                      >
                        <option value="">-- Select Stamp --</option>
                        {getFilteredStamps(activeCategory?.name).map((st) => (
                          <option key={st.id} value={st.name}>
                            {st.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 2: UNIT, NO. OF PIECES, STONE WEIGHT (CT) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider">
                          UNIT
                        </label>
                        <button
                          type="button"
                          onClick={() => handleOpenMasterModal('unit')}
                          className="text-[10px] text-[#b01622] font-bold hover:underline"
                        >
                          + CRUD
                        </button>
                      </div>
                      <select
                        name="unit"
                        value={formData.unit || 'Carats'}
                        onChange={handleInputChange}
                        className="w-full p-3 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622] cursor-pointer"
                      >
                        {unitsList.length > 0 ? (
                          unitsList.map((u) => (
                            <option key={u.id} value={u.name}>
                              {u.name}
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="Carats">Carats</option>
                            <option value="Carat">Carat</option>
                            <option value="Grams">Grams</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                        NO. OF PIECES
                      </label>
                      <input
                        type="number"
                        name="no_of_pieces"
                        value={formData.no_of_pieces}
                        onChange={handleInputChange}
                        placeholder="1"
                        className="w-full p-3 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                        STONE WEIGHT (CT)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        name="stone_weight"
                        value={formData.stone_weight || formData.gross_wt}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData((prev) => ({
                            ...prev,
                            stone_weight: val,
                            gross_wt: val,
                            net_wt: val,
                          }));
                        }}
                        placeholder={isDiamondOrStoneCat(activeCategory?.name) || pageStep !== 6 ? 'e.g. 0.50' : 'e.g. 0.500'}
                        className="w-full p-3 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622]"
                      />
                    </div>
                  </div>

                  {/* Row 3: COMPONENT PURCHASE RATE & VALUE */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                        {isDiamondOrStoneCat(activeCategory?.name) ? 'PURCHASE RATE PER CARAT (₹/ct)' : 'PURCHASE RATE PER GRAM (₹/g)'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="purchase_rate"
                        value={formData.purchase_rate}
                        onChange={handleInputChange}
                        placeholder={isDiamondOrStoneCat(activeCategory?.name) ? 'e.g. 50000.00' : 'e.g. 6800.00'}
                        className="w-full p-3 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#b01622] uppercase tracking-wider mb-1">
                        COMPONENT PURCHASE VALUE (₹)
                      </label>
                      <input
                        type="text"
                        name="purchase_value"
                        value={formData.purchase_value ? `₹ ${parseFloat(formData.purchase_value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₹ 0.00'}
                        placeholder="₹ 0.00"
                        className="w-full p-3 bg-stone-100 border border-stone-300 rounded-xl text-xs font-mono font-black text-[#b01622] focus:outline-none cursor-not-allowed"
                        readOnly
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Bottom Actions */}
              <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-stone-200/80">
                <button
                  type="button"
                  onClick={() => {
                    if (pageStep === 7) {
                      handleEditMainGoldItem();
                    } else {
                      navigate('/inventory/add-new/subcategory');
                    }
                  }}
                  className="w-full sm:w-auto px-6 py-3 bg-white border border-stone-300 hover:border-stone-400 text-stone-700 hover:bg-stone-50 rounded-xl text-xs font-bold shadow-2xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <i className="fa-solid fa-arrow-left text-xs"></i>
                  <span>Back</span>
                </button>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                  {pageStep === 6 ? (
                    <button
                      type="submit"
                      className="w-full sm:w-auto px-10 py-3.5 bg-[#b01622] hover:bg-[#8f1019] text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Next to Components</span>
                      <i className="fa-solid fa-arrow-right text-xs"></i>
                    </button>
                  ) : (
                    <>
                      <button
                        type="submit"
                        className="w-full sm:w-auto px-6 py-3 bg-white border-2 border-[#b01622] text-[#b01622] hover:bg-red-50/50 rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <i className={`fa-solid ${editingComponentTempId ? 'fa-check' : 'fa-plus'} text-xs`}></i>
                        <span>{editingComponentTempId ? 'Save Component Edit' : 'Add New Item'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleUploadProductToInventory}
                        disabled={isSubmitting}
                        className="w-full sm:w-auto px-8 py-3.5 bg-[#b01622] hover:bg-[#8f1019] text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <>
                            <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                            <span>Uploading Product...</span>
                          </>
                        ) : (
                          <>
                            <span>Upload Product to Inventory</span>
                            <i className="fa-solid fa-cloud-arrow-up text-xs"></i>
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>

            </div>

          </div>

        </form>

      </div>

      {/* Quick CRUD Master Modal */}
      {showCrudModal && (
        <QuickDropdownCrudModal
          isOpen={showCrudModal}
          onClose={() => setShowCrudModal(false)}
          type={crudModalType}
          onItemSelect={(val, fullItem) => {
            if (crudModalType === 'item' || crudModalType === 'item_master') setFormData((prev) => ({ ...prev, item_name: val }));
            if (crudModalType === 'karat') setFormData((prev) => ({ ...prev, karat: val }));
            if (crudModalType === 'stamp') setFormData((prev) => ({ ...prev, stamp: val }));
            if (crudModalType === 'unit') setFormData((prev) => ({ ...prev, unit: val }));
            if (crudModalType === 'component_category') {
              const catObj = fullItem || { id: val, name: val };
              setActiveCategory(catObj);
              setFormData((prev) => ({
                ...prev,
                item_name: catObj.name || val,
                item_code: generateCode(catObj),
              }));
            }
          }}
          onRefresh={fetchMasters}
        />
      )}

    </div>
  );
}
