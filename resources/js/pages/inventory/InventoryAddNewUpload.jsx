import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { compressImageFile } from '../../utils/imageCompressor';
import QuickDropdownCrudModal from '../../components/QuickDropdownCrudModal';

export default function InventoryAddNewUpload() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const fileInputRef = useRef(null);

  // Flow step state: 6 = Item Detail Entry (Component 1), 7 = Paired Component Entry (Component 2+)
  const [pageStep, setPageStep] = useState(6);

  // Master lists
  const [categoriesList, setCategoriesList] = useState([]);
  const [subcategoriesList, setSubcategoriesList] = useState([]);
  const [karatsList, setKaratsList] = useState([]);
  const [stampsList, setStampsList] = useState([]);
  const [unitsList, setUnitsList] = useState([]);
  const [itemsMasterList, setItemsMasterList] = useState([]);
  const [selectedItemMasterId, setSelectedItemMasterId] = useState('');

  // Master management modals
  const [crudModalType, setCrudModalType] = useState(null); // 'karat' | 'stamp' | 'unit'
  const [showCrudModal, setShowCrudModal] = useState(false);

  // Context from Page 5
  const [primaryCategory, setPrimaryCategory] = useState(null);
  const [primarySubcategory, setPrimarySubcategory] = useState(null);

  // Added components for current product
  const [addedComponents, setAddedComponents] = useState([]);

  // Form State for current active component form entry
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeSubcategory, setActiveSubcategory] = useState(null);

  const [formData, setFormData] = useState({
    item_code: '',
    item_name: '',
    karat: '22K',
    purity: '91.6',
    gross_wt: '',
    net_wt: '',
    pure_weight: '',
    stamp: '916',
    unit: 'Carat',
    gold_rate: '',
    other_rate: '',
    sale_rate: '',
    sale_value: '',
    size: '0.00',
    no_of_pieces: '1',
    description: '',
  });

  const [liveRates, setLiveRates] = useState(null);

  // Multi-Image Upload state for current active component
  const [images, setImages] = useState([]);
  const [imageError, setImageError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch Masters & Load Initial Category Context
  const fetchMasters = async () => {
    try {
      const [catRes, karatRes, stampRes, unitRes, rateRes] = await Promise.all([
        api.get('/inventory/categories').catch(() => api.get('/categories')),
        api.get('/karats').catch(() => ({ data: [] })),
        api.get('/stamps').catch(() => ({ data: [] })),
        api.get('/units').catch(() => ({ data: [] })),
        api.get('/metal-rates').catch(() => ({ data: null })),
      ]);

      const cats = catRes.data?.categories || catRes.data || [];
      setCategoriesList(cats);
      setKaratsList(karatRes.data || []);
      setStampsList(stampRes.data || []);
      setUnitsList(unitRes.data || []);

      if (rateRes.data) {
        setLiveRates(rateRes.data);
      }
    } catch (err) {
      console.error('Failed to load master data:', err);
    }
  };

  useEffect(() => {
    fetchMasters();

    // Retrieve session category/subcategory selected on Page 5
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

      setFormData((prev) => ({
        ...prev,
        item_code: defaultCode,
        item_name: subName,
      }));
    } catch (e) {
      navigate('/inventory/add-new/category');
    }
  }, []);

  // Update gold_rate dynamically whenever liveRates or activeCategory changes
  useEffect(() => {
    if (liveRates) {
      const autoRate = getAutoGoldRate(activeCategory?.name || primaryCategory?.name, formData.purity, formData.karat, liveRates);
      if (autoRate) {
        setFormData(prev => ({
          ...prev,
          gold_rate: prev.gold_rate || autoRate,
          sale_rate: prev.sale_rate || String(Math.round(parseFloat(autoRate) * 1.08)),
        }));
      }
    }
  }, [liveRates, activeCategory]);

  // Update subcategories list when active category changes
  useEffect(() => {
    if (activeCategory) {
      const subcats = activeCategory.subcategories || [];
      setSubcategoriesList(subcats);
    } else {
      setSubcategoriesList([]);
    }
  }, [activeCategory]);

  // Fetch items master dynamically when active subcategory changes
  useEffect(() => {
    if (activeSubcategory?.id) {
      api.get('/items', { params: { subcategory_id: activeSubcategory.id } })
        .then((res) => {
          const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
          setItemsMasterList(list);
          if (list.length > 0) {
            setSelectedItemMasterId(list[0].id);
            setFormData(prev => ({
              ...prev,
              item_name: list[0].name,
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

  const handleItemMasterChange = (itemId) => {
    setSelectedItemMasterId(itemId);
    const found = itemsMasterList.find((i) => String(i.id) === String(itemId));
    if (found) {
      setFormData((prev) => ({
        ...prev,
        item_name: found.name,
      }));
    }
  };

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

  const computePureWeight = (netWtStr, purityStr) => {
    const net = parseFloat(netWtStr) || 0;
    let purity = parseFloat(purityStr) || 0;
    if (net <= 0 || purity <= 0) return '';
    const factor = purity > 1 ? purity / 100 : purity;
    return (net * factor).toFixed(3);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      if (name === 'gross_wt' || name === 'net_wt' || name === 'purity') {
        const netValue = name === 'net_wt' ? value : (updated.net_wt || updated.gross_wt);
        const calcPure = computePureWeight(netValue, updated.purity);
        updated.pure_weight = calcPure;
      }

      if (name === 'gross_wt' && (!prev.net_wt || prev.net_wt === prev.gross_wt)) {
        updated.net_wt = value;
        const calcPure = computePureWeight(value, updated.purity);
        updated.pure_weight = calcPure;
      }

      if (name === 'karat') {
        if (value.includes('24')) updated.purity = '99.9';
        else if (value.includes('22')) updated.purity = '91.6';
        else if (value.includes('18')) updated.purity = '75.0';
        else if (value.includes('14')) updated.purity = '58.5';

        const autoRate = getAutoGoldRate(activeCategory?.name || primaryCategory?.name, updated.purity, value);
        if (autoRate) {
          updated.gold_rate = autoRate;
          updated.sale_rate = String(Math.round(parseFloat(autoRate) * 1.08));
        }
      }

      if (name === 'gross_wt' || name === 'net_wt' || name === 'gold_rate' || name === 'sale_rate') {
        const wt = parseFloat(updated.net_wt || updated.gross_wt) || 0;
        const sRate = parseFloat(updated.sale_rate) || 0;
        if (wt > 0 && sRate > 0) {
          updated.sale_value = (wt * sRate).toFixed(2);
        }
      }

      return updated;
    });
  };

  // Handle Multi-Image Upload & Compression
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

  // Main product data captured on Page 6
  const [mainProductData, setMainProductData] = useState(null);

  // Add current active component to addedComponents array (Page 7)
  const handleAddComponent = (e) => {
    e.preventDefault();

    const componentPayload = {
      id_temp: Date.now() + Math.random(),
      component_type: `Component ${addedComponents.length + 1}`,
      category_id: activeCategory?.id,
      subcategory_id: activeSubcategory?.id,
      category_name: activeCategory?.name || 'Category',
      subcategory_name: activeSubcategory?.name || 'Subcategory',
      item_code: formData.item_code,
      item_name: formData.item_name || activeSubcategory?.name || activeCategory?.name || 'Component',
      karat: formData.karat,
      purity: formData.purity,
      gross_wt: parseFloat(formData.gross_wt) || 0,
      net_wt: parseFloat(formData.net_wt) || parseFloat(formData.gross_wt) || 0,
      pure_weight: parseFloat(formData.pure_weight) || 0,
      stamp: formData.stamp,
      unit: formData.unit,
      gold_rate: formData.gold_rate,
      other_rate: formData.other_rate,
      sale_rate: formData.sale_rate,
      sale_value: formData.sale_value,
      size: formData.size,
      no_of_pieces: formData.no_of_pieces,
      images: [...images],
      thumb_image: images[0] || '',
    };

    setAddedComponents((prev) => [...prev, componentPayload]);
    showToast(`Added component "${componentPayload.item_name}"!`, 'success');

    // Reset component form state for next component entry on Page 7 (preserve uploaded product photos)
    setImageError(false);

    const defaultCode = generateCode(activeCategory);

    setFormData({
      item_code: defaultCode,
      item_name: activeCategory?.name || 'Component',
      karat: '22K',
      purity: '91.6',
      gross_wt: '',
      net_wt: '',
      pure_weight: '',
      stamp: '916',
      unit: 'Carat',
      gold_rate: liveRates ? getAutoGoldRate(activeCategory?.name, '916', '22K', liveRates) : '',
      other_rate: '',
      sale_rate: '',
      sale_value: '',
      size: '0.00',
      no_of_pieces: '1',
      description: '',
    });
  };

  const handlePage6Next = (e) => {
    e.preventDefault();

    const mainRecord = {
      category_id: activeCategory?.id,
      subcategory_id: activeSubcategory?.id,
      category_name: activeCategory?.name || 'Category',
      subcategory_name: activeSubcategory?.name || 'Subcategory',
      item_code: formData.item_code,
      item_name: formData.item_name || activeSubcategory?.name || activeCategory?.name || 'Main Product',
      karat: formData.karat,
      purity: formData.purity,
      gross_wt: parseFloat(formData.gross_wt) || 0,
      net_wt: parseFloat(formData.net_wt) || parseFloat(formData.gross_wt) || 0,
      pure_weight: parseFloat(formData.pure_weight) || 0,
      stamp: formData.stamp,
      unit: formData.unit,
      gold_rate: formData.gold_rate,
      other_rate: formData.other_rate,
      sale_rate: formData.sale_rate,
      sale_value: formData.sale_value,
      size: formData.size,
      no_of_pieces: formData.no_of_pieces,
      images: [...images],
      thumb_image: images[0] || '',
    };

    setMainProductData(mainRecord);
    setPageStep(7);
    // Keep uploaded product images intact across continuous pages
    setImageError(false);

    // Reset form for Page 7 components
    setFormData({
      item_code: generateCode(activeCategory),
      item_name: activeCategory?.name || 'Component',
      karat: '22K',
      purity: '91.6',
      gross_wt: '',
      net_wt: '',
      pure_weight: '',
      stamp: '916',
      unit: 'Carat',
      gold_rate: liveRates ? getAutoGoldRate(activeCategory?.name, '916', '22K', liveRates) : '',
      other_rate: '',
      sale_rate: '',
      sale_value: '',
      size: '0.00',
      no_of_pieces: '1',
      description: '',
    });

    showToast('Main product saved! Enter component details now.', 'info');
  };

  const handleRemoveComponent = (tempId) => {
    setAddedComponents((prev) => prev.filter((c) => c.id_temp !== tempId));
    showToast('Component removed', 'info');
  };

  // Final Product Save & Upload to Backend
  const handleUploadProductToInventory = async () => {
    const defaultCode = generateCode(activeCategory || primaryCategory);

    let primaryComp = mainProductData;

    if (!primaryComp) {
      if (addedComponents.length > 0) {
        primaryComp = addedComponents[0];
      } else {
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
          net_wt: parseFloat(formData.net_wt) || parseFloat(formData.gross_wt) || 0,
          pure_weight: parseFloat(formData.pure_weight) || 0,
          stamp: formData.stamp || '916',
          unit: formData.unit || 'Carat',
          sale_value: parseFloat(formData.sale_value) || 0,
          thumb_image: images[0] || '',
          images: [...images],
        };
      }
    }

    const extraComponents = mainProductData
      ? [...addedComponents]
      : (addedComponents.length > 0 ? addedComponents.slice(1) : []);

    const allComponents = [primaryComp, ...extraComponents];

    const totalGross = allComponents.reduce((sum, c) => sum + (parseFloat(c.gross_wt) || 0), 0);
    const totalNet = allComponents.reduce((sum, c) => sum + (parseFloat(c.net_wt) || 0), 0);
    const totalPure = allComponents.reduce((sum, c) => sum + (parseFloat(c.pure_weight) || 0), 0);
    const totalSaleVal = allComponents.reduce((sum, c) => sum + (parseFloat(c.sale_value) || 0), 0);

    const catCodeStr = (primaryCategory?.code || primaryComp.category_name || 'PRD').replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase();
    const subCodeStr = (primarySubcategory?.code || primaryComp.subcategory_name || 'GEN').replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase();
    const generatedSku = `SKU-${catCodeStr}-${subCodeStr}-${Math.floor(1000 + Math.random() * 9000)}`;

    const cleanName = primaryComp.item_name && primaryComp.item_name.toLowerCase() !== 'main product'
      ? primaryComp.item_name
      : `${primaryCategory?.name || primaryComp.category_name || 'Jewelry'} - ${primarySubcategory?.name || primaryComp.subcategory_name || 'Product'}`;

    const productRecord = {
      category_id: primaryCategory?.id || primaryComp.category_id,
      subcategory_id: primarySubcategory?.id || primaryComp.subcategory_id,
      category_name: primaryCategory?.name || primaryComp.category_name,
      subcategory_name: primarySubcategory?.name || primaryComp.subcategory_name,
      product_code: primaryComp.item_code || defaultCode,
      sku: generatedSku,
      name: cleanName,
      gross_wt: totalGross,
      net_wt: totalNet,
      pure_weight: totalPure,
      purity: primaryComp.purity,
      karat: primaryComp.karat,
      stamp: primaryComp.stamp,
      unit: primaryComp.unit,
      sale_value: totalSaleVal,
      thumb_image: primaryComp.thumb_image,
      image: primaryComp.thumb_image,
      images: primaryComp.images,
      components: allComponents,
      stock_qty: 1,
    };

    try {
      setIsSubmitting(true);
      const res = await api.post('/inventory', {
        items: [productRecord],
      });

      const savedProducts = res.data?.products || [productRecord];

      try {
        sessionStorage.setItem('inventory_last_uploaded_items', JSON.stringify(savedProducts));
        sessionStorage.removeItem('inventory_selected_category');
        sessionStorage.removeItem('inventory_selected_subcategory');
      } catch (storageErr) {
        console.warn('SessionStorage quota bypass:', storageErr);
      }

      showToast(res.data?.message || 'Product and all components uploaded successfully!', 'success');
      navigate('/inventory/add-new/complete');
    } catch (err) {
      console.error('Failed to save product to inventory', err);
      let msg = err.response?.data?.message || err.message || 'Failed to upload product';
      if (err.response?.data?.errors && typeof err.response.data.errors === 'object') {
        const firstErr = Object.values(err.response.data.errors).flat()[0];
        if (firstErr) msg = firstErr;
      }
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reusable Left Side Multi-Image Upload Component matching Figma exact design
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

      {/* Main Thumbnail Dropzone */}
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
              Drag & Drop Product Images
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

      {/* Child Images Gallery below Main Dropzone */}
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

            {/* Add More slot */}
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

      {/* 1. Exact Stepper Matching Screenshot */}
      <div className="flex items-center justify-center pt-2 pb-4">
        <div className="flex items-center gap-4 sm:gap-12">

          {/* Step 1 */}
          <div className="flex flex-col items-center">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shadow-2xs ${pageStep >= 6 ? 'bg-[#b01622] text-white' : 'bg-stone-200 text-stone-600'
              }`}>
              1
            </div>
            <span className={`text-xs font-bold mt-2 ${pageStep >= 6 ? 'text-[#b01622]' : 'text-stone-500'}`}>
              Upload File
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
              Valid Data
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

      {/* 2. Added Components Queue Table (Matching Image 1) */}
      {addedComponents.length > 0 && (
        <div className="bg-stone-50/70 rounded-2xl border border-stone-200/80 shadow-2xs overflow-hidden mb-6 animate-fadeIn">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-200/80 bg-stone-100/50 text-gray-700 font-bold text-center text-xs">
                  <th className="py-4 px-6 text-center">Product Image</th>
                  <th className="py-4 px-6 text-center">Category</th>
                  <th className="py-4 px-6 text-center">Stamp</th>
                  <th className="py-4 px-6 text-center">Unit</th>
                  <th className="py-4 px-6 text-center">Pieces</th>
                  <th className="py-4 px-6 text-center">Weight</th>
                  <th className="py-4 px-6 text-center">Rate</th>
                  <th className="py-4 px-3 text-center w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/60 bg-white">
                {addedComponents.map((comp, idx) => {
                  const img = comp.thumb_image || (comp.images && comp.images[0]) || '/placeholder-jewelry.png';
                  const catName = comp.category_name || comp.item_name || 'Category';
                  const stamp = comp.stamp || '+0';
                  const unit = comp.unit || 'Carat';
                  const pieces = comp.no_of_pieces || 1;
                  const weight = (parseFloat(comp.gross_wt) || parseFloat(comp.net_wt) || 0).toFixed(1) + 'g';
                  const rate = parseFloat(comp.gold_rate || comp.sale_rate || 0).toFixed(2);

                  return (
                    <tr key={comp.id_temp || idx} className="hover:bg-stone-50/60 transition-colors text-center text-xs font-medium text-gray-800">
                      <td className="py-3 px-6 text-center">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-stone-900 shadow-2xs mx-auto border border-stone-200 flex items-center justify-center">
                          <img
                            src={img}
                            alt={catName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '/placeholder-jewelry.png';
                            }}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-6 text-center text-gray-900 font-medium">
                        {catName}
                      </td>
                      <td className="py-3 px-6 text-center text-stone-600 font-mono">
                        {stamp}
                      </td>
                      <td className="py-3 px-6 text-center text-stone-600 font-medium">
                        {unit}
                      </td>
                      <td className="py-3 px-6 text-center text-gray-900 font-bold">
                        {pieces}
                      </td>
                      <td className="py-3 px-6 text-center font-mono font-semibold text-gray-800">
                        {weight}
                      </td>
                      <td className="py-3 px-6 text-center font-mono font-semibold text-stone-700">
                        {rate}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveComponent(comp.id_temp)}
                          className="w-6 h-6 rounded-md bg-stone-100 hover:bg-red-100 text-stone-400 hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer mx-auto"
                          title="Remove Component"
                        >
                          <i className="fa-solid fa-xmark text-xs"></i>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Main Form Card matching exact Screenshot */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm overflow-hidden">

        {/* Dark Red Header Banner matching Screenshot */}
        <div className="bg-[#b01622] text-white px-8 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">New Item Upload</h2>
            <p className="text-xs text-red-100 font-normal mt-0.5">
              Efficiently add individual items to the diamond inventory with direct data entry.
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center text-white text-xl">
            <i className="fa-solid fa-cloud-arrow-up"></i>
          </div>
        </div>

        {/* Clean White Inner Form Container */}
        <form onSubmit={pageStep === 6 ? handlePage6Next : handleAddComponent} className="p-8 bg-white space-y-6">

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* Left Column: Product Media Upload */}
            <div className="lg:col-span-5">
              {renderMultiImageUploader()}
            </div>

            {/* Right Column: Form Inputs with Soft Pinkish-Beige Input Boxes (#f7f0f0 background & #e6c5c5 border) */}
            <div className="lg:col-span-7 space-y-5">

              {pageStep === 6 ? (
                <>
                  {/* Page 6 Fields: Basic Item Detail Entry */}
                  {/* Row 1: ITEM NAME (Dropdown from Item Masters) & DESIGN NO */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                            <option value={formData.item_name || activeSubcategory?.name || 'Diamond Ring (Open)'}>
                              {formData.item_name || activeSubcategory?.name || 'Diamond Ring (Open)'}
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
                        DESIGN NO
                      </label>
                      <input
                        type="text"
                        name="item_code"
                        value={formData.item_code}
                        onChange={handleInputChange}
                        placeholder="RD-DIA-001"
                        className="w-full p-3 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622]"
                      />
                    </div>
                  </div>

                  {/* Row 2: KARAT (MASTER), PURITY (NUMERIC), SIZE, NO. OF PIECES */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider">
                          KARAT
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
                          handleInputChange(e);
                          const kVal = e.target.value;
                          let pVal = '91.6';
                          if (kVal.includes('24')) pVal = '99.9';
                          else if (kVal.includes('18')) pVal = '75.0';
                          else if (kVal.includes('14')) pVal = '58.5';
                          setFormData((prev) => ({
                            ...prev,
                            karat: kVal,
                            purity: pVal,
                            pure_weight: computePureWeight(prev.net_wt || prev.gross_wt, pVal),
                          }));
                        }}
                        className="w-full p-3 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622] cursor-pointer"
                      >
                        {karatsList.map((k) => (
                          <option key={k.id} value={k.name}>
                            {k.name}
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
                        placeholder="91.6"
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

                  {/* Row 3: GROSS WEIGHT, NET WEIGHT, and PURE WEIGHT OF 24K */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                        GROSS WEIGHT
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        name="gross_wt"
                        value={formData.gross_wt}
                        onChange={handleInputChange}
                        placeholder="0.00g"
                        className="w-full p-3 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                        NET WEIGHT
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        name="net_wt"
                        value={formData.net_wt}
                        onChange={handleInputChange}
                        placeholder="0.00g"
                        className="w-full p-3 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#b01622] uppercase tracking-wider mb-1">
                        PURE WEIGHT OF 24K
                      </label>
                      <input
                        type="text"
                        name="pure_weight"
                        value={formData.pure_weight ? `${formData.pure_weight}g` : ''}
                        placeholder="0.00g"
                        className="w-full p-3 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-mono font-black text-[#b01622] focus:outline-none"
                        readOnly
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Page 7 Fields: Component Detail Entry */}
                  {/* Row 1: CATEGORY & STAMP */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                        CATEGORY
                      </label>
                      <select
                        name="category_id"
                        value={activeCategory?.id || ''}
                        onChange={(e) => {
                          const cat = categoriesList.find((c) => String(c.id) === String(e.target.value));
                          if (cat) {
                            setActiveCategory(cat);
                            const sub = cat.subcategories?.[0] || null;
                            setActiveSubcategory(sub);
                            setFormData((prev) => ({
                              ...prev,
                              item_name: sub?.name || cat.name || 'Component',
                            }));
                          }
                        }}
                        className="w-full p-3 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622] cursor-pointer"
                      >
                        {categoriesList.map((cat) => (
                          <option key={cat.id} value={cat.id}>
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
                        value={formData.stamp}
                        onChange={handleInputChange}
                        className="w-full p-3 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622] cursor-pointer"
                      >
                        {stampsList.map((st) => (
                          <option key={st.id} value={st.name}>
                            {st.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 2: UNIT (MASTER), SIZE, NO. OF PIECES */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                        value={formData.unit}
                        onChange={handleInputChange}
                        className="w-full p-3 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622] cursor-pointer"
                      >
                        {unitsList.map((u) => (
                          <option key={u.id} value={u.name}>
                            {u.name}
                          </option>
                        ))}
                      </select>
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

                  {/* Row 3: GROSS WEIGHT, NET WEIGHT, PURE WEIGHT OF 24K */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                        GROSS WEIGHT
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        name="gross_wt"
                        value={formData.gross_wt}
                        onChange={handleInputChange}
                        placeholder="0.00g"
                        className="w-full p-3 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                        NET WEIGHT
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        name="net_wt"
                        value={formData.net_wt}
                        onChange={handleInputChange}
                        placeholder="0.00g"
                        className="w-full p-3 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#b01622] uppercase tracking-wider mb-1">
                        PURE WEIGHT OF 24K
                      </label>
                      <input
                        type="text"
                        name="pure_weight"
                        value={formData.pure_weight ? `${formData.pure_weight}g` : ''}
                        placeholder="0.00g"
                        className="w-full p-3 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-mono font-black text-[#b01622] focus:outline-none"
                        readOnly
                      />
                    </div>
                  </div>

                  {/* Row 4: RATE, SALE RATE, SALE VALUE */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                        RATE
                      </label>
                      <input
                        type="text"
                        name="gold_rate"
                        value={formData.gold_rate}
                        onChange={handleInputChange}
                        placeholder="Auto Generate"
                        className="w-full p-3 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                        SALE RATE
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="sale_rate"
                        value={formData.sale_rate}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        className="w-full p-3 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                        SALE VALUE
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="sale_value"
                        value={formData.sale_value}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        className="w-full p-3 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622]"
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
                      setPageStep(6);
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
                      <span>Next</span>
                      <i className="fa-solid fa-arrow-right text-xs"></i>
                    </button>
                  ) : (
                    <>
                      <button
                        type="submit"
                        className="w-full sm:w-auto px-6 py-3 bg-white border-2 border-[#b01622] text-[#b01622] hover:bg-red-50/50 rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <i className="fa-solid fa-plus text-xs"></i>
                        <span>Add New Item</span>
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
                            <span>Uploading...</span>
                          </>
                        ) : (
                          <>
                            <span>Upload New Item</span>
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

      {/* 4. Quick CRUD Master Modal for Item, Karat, Stamp, Unit */}
      {showCrudModal && (
        <QuickDropdownCrudModal
          isOpen={showCrudModal}
          onClose={() => setShowCrudModal(false)}
          type={crudModalType}
          onItemSelect={(val) => {
            if (crudModalType === 'item' || crudModalType === 'item_master') setFormData((prev) => ({ ...prev, item_name: val }));
            if (crudModalType === 'karat') setFormData((prev) => ({ ...prev, karat: val }));
            if (crudModalType === 'stamp') setFormData((prev) => ({ ...prev, stamp: val }));
            if (crudModalType === 'unit') setFormData((prev) => ({ ...prev, unit: val }));
          }}
          onRefresh={fetchMasters}
        />
      )}

    </div>
  );
}
