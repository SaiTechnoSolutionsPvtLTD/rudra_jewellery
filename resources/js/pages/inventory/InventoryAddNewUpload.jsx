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

  // Setting Styles Master Data State
  const [settingStyles, setSettingStyles] = useState([]);
  const [showStylesModal, setShowStylesModal] = useState(false);

  // Stored Category & Subcategory context
  const [category, setCategory] = useState(null);
  const [subcategory, setSubcategory] = useState(null);

  // Subscreen-3: Batch items ready to commit
  const [batchItems, setBatchItems] = useState([]);

  // Form State for current product being created
  const [formData, setFormData] = useState({
    product_code: '',
    name: '',
    gross_wt: '',
    net_wt: '',
    purity: '22K (91.6%)',
    setting_style: 'Prong Setting',
    dia_wt_ct: '',
    wastage_percent: '3.50',
    making_charge: '650',
    open_close_type: 'Close',
    open_close_details: 'Standard Fixed Bangle / Ring',
    stock_qty: '1',
    description: '',
    // Pricing & Measurement fields
    stamp: '+0',
    unit: 'Carat',
    no_of_pieces: '',
    weight: '',
    rate: '',
    sale_rate: '',
    sale_value: '',
  });

  // Images state for current product (first image is Thumb Image, others are Child Images)
  const [images, setImages] = useState([]);
  const [imageError, setImageError] = useState(false);
  const [rateManuallyEdited, setRateManuallyEdited] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Metal bullion base rate helper
  const getBaseRateForPurity = (purityStr = '', catName = '') => {
    const cat = (catName || '').toLowerCase();
    if (cat.includes('silver')) return 85;
    if (cat.includes('diamond')) return 65000;
    if (cat.includes('platinum')) return 3450;

    if (purityStr?.includes('24K')) return 7480;
    if (purityStr?.includes('22K')) return 6850;
    if (purityStr?.includes('18K')) return 5600;
    if (purityStr?.includes('14K')) return 4360;
    return 6850;
  };

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
    // 1. Retrieve session selections
    const savedCat = sessionStorage.getItem('inventory_selected_category');
    const savedSub = sessionStorage.getItem('inventory_selected_subcategory');

    if (!savedCat) {
      showToast('Please select a category first', 'warning');
      navigate('/inventory/add-new/category');
      return;
    }

    try {
      const parsedCat = JSON.parse(savedCat);
      setCategory(parsedCat);

      if (savedSub) {
        setSubcategory(JSON.parse(savedSub));
      }

      // Generate a default product code based on category
      generateNewCode(parsedCat);

      // Auto-compute default rates for standard 22K gold or metal
      const baseRate = getBaseRateForPurity('22K (91.6%)', parsedCat?.name);
      const wastage = 3.50;
      const making = 650;
      const autoSaleRate = Math.round(baseRate * (1 + wastage / 100) + making);

      setFormData((prev) => ({
        ...prev,
        rate: baseRate.toString(),
        sale_rate: autoSaleRate.toString(),
      }));
    } catch (e) {
      navigate('/inventory/add-new/category');
    }
  }, []);

  const generateNewCode = (catObj) => {
    const prefix = catObj?.code ? catObj.code.slice(0, 3).toUpperCase() : 'RJ';
    const randNum = Math.floor(1000 + Math.random() * 9000);
    setFormData((prev) => ({
      ...prev,
      product_code: `${prefix}-${randNum}`,
    }));
  };

  // Re-calculate rates automatically whenever purity, weights, wastage, or making charges change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      // Auto compute net weight if gross weight provided and net weight empty
      if (name === 'gross_wt' && (!prev.net_wt || prev.net_wt === prev.gross_wt)) {
        updated.net_wt = value;
      }

      if (name === 'rate') {
        setRateManuallyEdited(true);
      }

      // Determine effective metal base rate
      let baseRate = parseFloat(updated.rate) || 0;
      if (name === 'purity' || (!rateManuallyEdited && (name !== 'rate' || !updated.rate))) {
        if (name === 'purity' || !rateManuallyEdited) {
          baseRate = getBaseRateForPurity(updated.purity, category?.name);
          updated.rate = baseRate.toString();
        }
      }

      const wastage = parseFloat(updated.wastage_percent) || 0;
      const making = parseFloat(updated.making_charge) || 0;
      const computedSaleRate = baseRate > 0 ? Math.round(baseRate * (1 + wastage / 100) + making) : 0;

      const effectiveWt = parseFloat(updated.net_wt) || parseFloat(updated.gross_wt) || 0;
      const diaWt = parseFloat(updated.dia_wt_ct) || 0;
      const diaVal = diaWt * 65000;
      const computedSaleValue = effectiveWt > 0 ? Math.round(effectiveWt * computedSaleRate + diaVal) : 0;

      if (name !== 'sale_rate') {
        updated.sale_rate = computedSaleRate > 0 ? computedSaleRate.toString() : '';
      }
      if (name !== 'sale_value') {
        updated.sale_value = computedSaleValue > 0 ? computedSaleValue.toString() : '';
      }

      return updated;
    });
  };

  const handleResetToAutoRates = () => {
    setRateManuallyEdited(false);
    const baseRate = getBaseRateForPurity(formData.purity, category?.name);
    const wastage = parseFloat(formData.wastage_percent) || 0;
    const making = parseFloat(formData.making_charge) || 0;
    const autoSaleRate = Math.round(baseRate * (1 + wastage / 100) + making);
    const effectiveWt = parseFloat(formData.net_wt) || parseFloat(formData.gross_wt) || 0;
    const diaWt = parseFloat(formData.dia_wt_ct) || 0;
    const autoSaleValue = Math.round(effectiveWt * autoSaleRate + (diaWt * 65000));

    setFormData((prev) => ({
      ...prev,
      rate: baseRate.toString(),
      sale_rate: autoSaleRate > 0 ? autoSaleRate.toString() : '',
      sale_value: autoSaleValue > 0 ? autoSaleValue.toString() : '',
    }));
    showToast(`Rates auto-recalculated based on ${formData.purity} (Base ₹${baseRate}/g)`, 'info');
  };

  const handleOpenCloseChange = (type) => {
    let details = 'Standard Fixed Circumference';
    if (type === 'Open') details = 'Adjustable Open Cuff / Free Size';
    if (type === 'Open-Close') details = 'Hinged Clasp with Safety Screw Lock';

    setFormData((prev) => ({
      ...prev,
      open_close_type: type,
      open_close_details: details,
    }));
  };

  // Image Upload handler - Supports multiple photos
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    let hasInvalid = false;
    const validFiles = files.filter((file) => {
      if (!file.type.startsWith('image/')) {
        hasInvalid = true;
        return false;
      }
      return true;
    });

    if (hasInvalid) {
      showToast('Only image files (PNG, JPG, WEBP) are accepted', 'warning');
    }

    if (!validFiles.length) return;

    // Fast asynchronous compression for instant preview and lightweight storage
    Promise.all(validFiles.map((file) => compressImageFile(file, 800, 0.82)))
      .then((compressedList) => {
        const successful = compressedList.filter(Boolean);
        if (successful.length > 0) {
          setImages((prev) => [...prev, ...successful]);
          setImageError(false);
          showToast(`Added ${successful.length} image(s). 1st image is the Main Thumbnail.`, 'success');
        }
      })
      .catch((err) => {
        console.error('Image compression failed', err);
        showToast('Failed to process image(s)', 'error');
      });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Promote any child image to become the Primary Thumbnail (index 0)
  const handleSetAsThumb = (index) => {
    if (index === 0) return;
    setImages((prev) => {
      const copy = [...prev];
      const [chosen] = copy.splice(index, 1);
      copy.unshift(chosen);
      return copy;
    });
    showToast('Image set as primary Main Thumbnail', 'info');
  };

  // SUB-SCREEN 3: "Upload New Item" (Add current form item to batch list)
  const handleAddBatchItem = (e) => {
    e?.preventDefault();

    // 1. Mandatory Image Check
    if (!images || images.length === 0) {
      setImageError(true);
      showToast('Product image is required! Please upload at least one image before adding.', 'error');
      const dropzone = document.getElementById('image-upload-section');
      if (dropzone) dropzone.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!formData.product_code.trim()) {
      showToast('Please enter an Item Code / SKU', 'error');
      return;
    }
    if (!formData.name.trim()) {
      showToast('Please enter a Product Name', 'error');
      return;
    }
    if (!formData.gross_wt) {
      showToast('Please enter Gross Weight in grams', 'error');
      return;
    }

    const thumbImage = images[0];
    const childImages = images.slice(1);

    const newItem = {
      ...formData,
      category_id: category?.id,
      subcategory_id: subcategory?.id,
      category_name: category?.name,
      subcategory_name: subcategory?.name,
      image: thumbImage,
      thumb_image: thumbImage,
      child_images: childImages,
      images: images,
      gross_wt: parseFloat(formData.gross_wt) || 0,
      net_wt: parseFloat(formData.net_wt) || parseFloat(formData.gross_wt) || 0,
      dia_wt_ct: formData.dia_wt_ct ? parseFloat(formData.dia_wt_ct) : null,
      stock_qty: parseInt(formData.stock_qty, 10) || 1,
      id_temp: Date.now(),
    };

    setBatchItems((prev) => [...prev, newItem]);
    showToast(`Added "${newItem.name}" to batch upload queue!`, 'success');

    // Reset form for next product and auto-increment code
    const parts = formData.product_code.split('-');
    let nextCode = '';
    if (parts.length > 1 && !isNaN(parts[parts.length - 1])) {
      const nextNum = parseInt(parts[parts.length - 1], 10) + 1;
      nextCode = `${parts.slice(0, -1).join('-')}-${nextNum}`;
    } else {
      const prefix = category?.code ? category.code.slice(0, 3).toUpperCase() : 'RJ';
      nextCode = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const baseRate = getBaseRateForPurity(formData.purity, category?.name);
    const wastage = parseFloat(formData.wastage_percent) || 3.50;
    const making = parseFloat(formData.making_charge) || 650;
    const nextSaleRate = Math.round(baseRate * (1 + wastage / 100) + making);

    setFormData({
      product_code: nextCode,
      name: '',
      gross_wt: '',
      net_wt: '',
      purity: formData.purity,
      setting_style: formData.setting_style,
      dia_wt_ct: '',
      wastage_percent: formData.wastage_percent,
      making_charge: formData.making_charge,
      open_close_type: formData.open_close_type,
      open_close_details: formData.open_close_details,
      stock_qty: '1',
      description: '',
      stamp: formData.stamp,
      unit: formData.unit,
      no_of_pieces: '',
      weight: '',
      rate: baseRate.toString(),
      sale_rate: nextSaleRate.toString(),
      sale_value: '',
    });
    setImages([]);
    setImageError(false);
  };

  const handleRemoveBatchItem = (tempId) => {
    setBatchItems((prev) => prev.filter((item) => item.id_temp !== tempId));
    showToast('Removed item from batch', 'info');
  };

  // FINAL STEP: Commit All Batch Items (or single current item if not batched)
  const handleCommitToInventory = async () => {
    let itemsToCommit = [...batchItems];

    // If batch is empty but current form has data, prompt/commit current form
    if (itemsToCommit.length === 0) {
      if (formData.name.trim() && formData.gross_wt) {
        if (!images || images.length === 0) {
          setImageError(true);
          showToast('Product image is required! Please upload at least one image before adding.', 'error');
          const dropzone = document.getElementById('image-upload-section');
          if (dropzone) dropzone.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }

        const thumbImage = images[0];
        const childImages = images.slice(1);

        const singleItem = {
          ...formData,
          category_id: category?.id,
          subcategory_id: subcategory?.id,
          image: thumbImage,
          thumb_image: thumbImage,
          child_images: childImages,
          images: images,
          gross_wt: parseFloat(formData.gross_wt) || 0,
          net_wt: parseFloat(formData.net_wt) || parseFloat(formData.gross_wt) || 0,
          dia_wt_ct: formData.dia_wt_ct ? parseFloat(formData.dia_wt_ct) : null,
          stock_qty: parseInt(formData.stock_qty, 10) || 1,
        };
        itemsToCommit.push(singleItem);
      } else {
        showToast('Please fill product details and upload an image before committing', 'warning');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const res = await api.post('/inventory', {
        items: itemsToCommit,
      });

      showToast(res.data?.message || 'Inventory updated successfully!', 'success');

      // Save uploaded items to session for completion summary screen
      sessionStorage.setItem('inventory_last_uploaded_items', JSON.stringify(itemsToCommit));

      // Clear session category/subcategory navigation
      sessionStorage.removeItem('inventory_selected_category');
      sessionStorage.removeItem('inventory_selected_subcategory');

      // Redirect to Upload Complete screen
      navigate('/inventory/add-new/complete');
    } catch (err) {
      console.error('Failed to commit inventory', err);
      const msg = err.response?.data?.message || 'Failed to save products to inventory';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full pb-20 space-y-6 font-['Inter',-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif] max-w-6xl mx-auto">

      {/* 1. Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-1">
            <Link to="/inventory" className="hover:text-gray-900 transition-colors">Inventory</Link>
            <span>›</span>
            <Link to="/inventory/add-new/category" className="hover:text-gray-900 transition-colors">Category</Link>
            <span>›</span>
            <Link to="/inventory/add-new/subcategory" className="hover:text-gray-900 transition-colors">Subcategory</Link>
            <span>›</span>
            <span className="text-[#b01622] font-bold">Step 3: Product Upload & Batch</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Add Product Details</h1>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/inventory/add-new/subcategory"
            className="px-4 py-2 bg-white border border-stone-300 hover:border-stone-400 text-stone-700 text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-2"
          >
            <i className="fa-solid fa-arrow-left text-xs"></i>
            <span>Back to Subcategory</span>
          </Link>

          {batchItems.length > 0 && (
            <button
              type="button"
              onClick={handleCommitToInventory}
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#b01622] hover:bg-[#8f1019] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-cloud-arrow-up text-xs"></i>
                  <span>Commit {batchItems.length} Item(s) to Inventory</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 2. Step Indicator matching Storyboard (Step 3 Active) */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs">
        <div className="flex items-center justify-center gap-3 sm:gap-6 text-xs font-bold">

          {/* Step 1 (Completed) */}
          <Link to="/inventory/add-new/category" className="flex items-center gap-2 text-stone-700 hover:text-[#b01622] transition-colors">
            <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-2xs">
              <i className="fa-solid fa-check text-[10px]"></i>
            </div>
            <span className="text-stone-500">{category?.name || 'Category'}</span>
          </Link>

          <div className="w-8 sm:w-16 h-0.5 bg-emerald-500"></div>

          {/* Step 2 (Completed) */}
          <Link to="/inventory/add-new/subcategory" className="flex items-center gap-2 text-stone-700 hover:text-[#b01622] transition-colors">
            <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-2xs">
              <i className="fa-solid fa-check text-[10px]"></i>
            </div>
            <span className="text-stone-500">{subcategory?.name || 'Subcategory'}</span>
          </Link>

          <div className="w-8 sm:w-16 h-0.5 bg-emerald-500"></div>

          {/* Step 3 (Active) */}
          <div className="flex items-center gap-2 text-[#b01622]">
            <div className="w-7 h-7 rounded-full bg-[#b01622] text-white flex items-center justify-center text-xs font-bold shadow-2xs">
              3
            </div>
            <span>Product Details</span>
          </div>

        </div>
      </div>

      {/* 3. Subscreen-3: Batch Table (Screen 8 & 9) */}
      {batchItems.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden transition-all animate-fadeIn">
          <div className="px-6 py-4 bg-red-50/50 border-b border-stone-200/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#b01622] text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                {batchItems.length}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Batch Upload Queue (Subscreen-3)</h3>
                <p className="text-[11px] text-stone-500">
                  {batchItems.length} item(s) prepared. Fill the form below to add another item or click Commit.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCommitToInventory}
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#b01622] hover:bg-[#8f1019] text-white text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <i className="fa-solid fa-check-double text-xs"></i>
              <span>Finish & Commit to Inventory</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50/80 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Item Preview</th>
                  <th className="py-3 px-4">Item Code</th>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4 text-right">Gross Wt (g)</th>
                  <th className="py-3 px-4 text-right">Net Wt (g)</th>
                  <th className="py-3 px-4">Purity</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {batchItems.map((item, idx) => (
                  <tr key={item.id_temp || idx} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <img
                        src={item.image || '/placeholder-jewelry.png'}
                        alt={item.name}
                        className="w-11 h-11 rounded-lg object-cover border border-stone-200 shadow-2xs bg-stone-50"
                      />
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-gray-900">
                      {item.product_code}
                    </td>
                    <td className="py-3 px-4 font-bold text-stone-800">
                      {item.name}
                      <span className="block text-[10px] text-stone-400 font-normal">
                        {item.category_name} › {item.subcategory_name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-stone-800">
                      {Number(item.gross_wt).toFixed(3)}g
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-stone-800">
                      {Number(item.net_wt).toFixed(3)}g
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                        {item.purity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-stone-600 font-medium">
                      {item.open_close_type}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveBatchItem(item.id_temp)}
                        className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center mx-auto transition-colors cursor-pointer"
                        title="Remove item"
                      >
                        <i className="fa-solid fa-trash-can text-xs"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Product Upload Form (Screens 6, 7 & 8) */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden">

        {/* Red banner matching Storyboard */}
        <div className="bg-[#b01622] text-white px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-red-200 block">
              Product Specifications Form
            </span>
            <h2 className="text-lg font-bold">
              Add New {subcategory?.name || 'Jewelry'} Item
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-white/20 backdrop-blur-xs px-3 py-1 rounded-full font-semibold">
              Category: {category?.name}
            </span>
            <span className="text-xs bg-white/20 backdrop-blur-xs px-3 py-1 rounded-full font-semibold">
              Subcategory: {subcategory?.name}
            </span>
          </div>
        </div>

        <form onSubmit={handleAddBatchItem} className="p-6 lg:p-8 space-y-8">

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* Left Column: Image Upload Manager */}
            <div id="image-upload-section" className="lg:col-span-4 space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span>Product Images</span>
                  <span className="text-red-500 font-bold">*</span>
                  <span className="text-[10px] text-red-500 font-normal lowercase">(required)</span>
                </label>
                <span className="text-[10px] text-stone-400 font-medium">
                  1st = Thumb, rest = Child
                </span>
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[190px] ${
                  imageError
                    ? 'border-red-500 bg-red-50/50 ring-2 ring-red-200'
                    : 'border-stone-300 hover:border-[#b01622] bg-stone-50/60 hover:bg-red-50/20'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl mb-3 ${
                  imageError ? 'bg-red-100 text-red-600' : 'bg-red-100/60 text-[#b01622]'
                }`}>
                  <i className="fa-solid fa-cloud-arrow-up"></i>
                </div>
                <h4 className="text-xs font-bold text-gray-900">
                  {images.length > 0 ? '+ Add More Product Images' : 'Upload Product Images *'}
                </h4>
                <p className="text-[11px] text-stone-500 mt-1">
                  Drag and drop or browse multiple files
                </p>
                <span className="text-[10px] text-stone-400 mt-2">
                  1st image is Thumbnail, others are Child Images
                </span>
              </div>

              {/* Error Alert if no image uploaded */}
              {imageError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2">
                  <i className="fa-solid fa-circle-exclamation text-sm text-red-600"></i>
                  <span>Product image is required! Please upload at least one image.</span>
                </div>
              )}

              {/* Thumbnails & Child Images list */}
              {images.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                      <i className="fa-solid fa-images text-[#b01622] text-xs"></i>
                      <span>Images ({images.length})</span>
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[11px] text-[#b01622] hover:underline font-semibold cursor-pointer"
                      >
                        + Add More
                      </button>
                      <button
                        type="button"
                        onClick={() => setImages([])}
                        className="text-[11px] text-stone-500 hover:text-red-600 hover:underline font-semibold cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    {images.map((img, idx) => (
                      <div
                        key={idx}
                        className={`relative group rounded-xl overflow-hidden border shadow-2xs aspect-square bg-stone-100 ${
                          idx === 0 ? 'border-2 border-[#b01622] ring-2 ring-red-100' : 'border-stone-200'
                        }`}
                      >
                        <img src={img} alt={`Image ${idx + 1}`} className="w-full h-full object-cover" />

                        {/* First Image: Thumb Badge */}
                        {idx === 0 ? (
                          <span className="absolute top-1 left-1 bg-[#b01622] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs flex items-center gap-1">
                            <i className="fa-solid fa-star text-[8px] text-amber-300"></i> Thumb
                          </span>
                        ) : (
                          /* Other Images: Child Badge + Set as Thumb button */
                          <>
                            <span className="absolute top-1 left-1 bg-black/70 text-white text-[8px] font-semibold px-1.5 py-0.5 rounded">
                              Child #{idx}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetAsThumb(idx);
                              }}
                              className="absolute bottom-1 left-1 right-1 text-[9px] bg-white/95 hover:bg-[#b01622] text-stone-800 hover:text-white font-bold py-0.5 rounded shadow text-center transition-colors cursor-pointer"
                              title="Set this image as primary thumbnail"
                            >
                              Set as Thumb
                            </button>
                          </>
                        )}

                        {/* Remove Image Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImage(idx);
                          }}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-red-600"
                          title="Delete photo"
                        >
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Informational helper banner */}
                  <div className="p-2.5 bg-stone-50 border border-stone-200/80 rounded-xl text-[11px] text-stone-600 flex items-start gap-2">
                    <i className="fa-solid fa-circle-info text-[#b01622] text-xs mt-0.5"></i>
                    <span>
                      <strong>1st image</strong> is the catalog <strong>Thumbnail</strong>. Additional images are saved as <strong>Child/Gallery images</strong>. Click &ldquo;Set as Thumb&rdquo; on any child photo to make it primary.
                    </span>
                  </div>
                </div>
              )}

              {/* Open / Close / Open-Close selector */}
              <div className="pt-4 border-t border-stone-100">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Structure / Locking Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['Close', 'Open', 'Open-Close'].map((type) => {
                    const isSelected = formData.open_close_type === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleOpenCloseChange(type)}
                        className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${isSelected
                          ? 'bg-[#b01622] text-white border-[#b01622] shadow-2xs'
                          : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                          }`}
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>

                {/* Conditional detail field based on Open/Close */}
                <div className="mt-3">
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                    Lock / Hinge Specification
                  </label>
                  <input
                    type="text"
                    name="open_close_details"
                    value={formData.open_close_details}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] focus:outline-hidden"
                    placeholder="e.g. Screw Clasp, Spring Hinge, Adjustable Free Size"
                  />
                </div>
              </div>

            </div>

            {/* Right Column: Main Specifications */}
            <div className="lg:col-span-8 space-y-5">

              {/* Row 1: SKU & Name */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-4">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Item Code / SKU <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="product_code"
                      value={formData.product_code}
                      onChange={handleChange}
                      required
                      className="w-full px-3.5 py-2.5 text-xs font-mono font-bold border border-stone-300 rounded-xl focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] focus:outline-hidden uppercase"
                      placeholder="e.g. RJ-GLD-101"
                    />
                    <button
                      type="button"
                      onClick={() => generateNewCode(category)}
                      className="absolute right-2 top-2 text-[10px] text-stone-400 hover:text-[#b01622] font-semibold cursor-pointer"
                      title="Auto generate code"
                    >
                      <i className="fa-solid fa-arrows-rotate mr-1"></i>Gen
                    </button>
                  </div>
                </div>

                <div className="sm:col-span-8">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Product Title / Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-3.5 py-2.5 text-xs border border-stone-300 rounded-xl focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] focus:outline-hidden font-semibold"
                    placeholder="e.g. 22K Antique Temple Floral Kada Bangle"
                  />
                </div>
              </div>

              {/* Row 2: Weights & Karat */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Gross Wt (Grams) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.001"
                      name="gross_wt"
                      value={formData.gross_wt}
                      onChange={handleChange}
                      required
                      className="w-full px-3.5 py-2.5 text-xs font-mono font-semibold border border-stone-300 rounded-xl focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] focus:outline-hidden"
                      placeholder="0.000"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs text-stone-400 font-bold">g</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Net Wt (Grams)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.001"
                      name="net_wt"
                      value={formData.net_wt}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 text-xs font-mono font-semibold border border-stone-300 rounded-xl focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] focus:outline-hidden"
                      placeholder="0.000"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs text-stone-400 font-bold">g</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Purity / Karat
                  </label>
                  <select
                    name="purity"
                    value={formData.purity}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 text-xs border border-stone-300 rounded-xl focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] focus:outline-hidden font-semibold bg-white"
                  >
                    <option value="24K (99.9%)">24K (99.9% Fine Gold)</option>
                    <option value="22K (91.6%)">22K (91.6% BIS Hallmark)</option>
                    <option value="18K (75.0%)">18K (75.0% Diamond Gold)</option>
                    <option value="14K (58.5%)">14K (58.5% Dailywear)</option>
                    <option value="925 Sterling Silver">925 Sterling Silver</option>
                    <option value="Platinum 950">Platinum 950</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Stone & Setting */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Diamond Weight (Carats)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      name="dia_wt_ct"
                      value={formData.dia_wt_ct}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 text-xs font-mono font-semibold border border-stone-300 rounded-xl focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] focus:outline-hidden"
                      placeholder="e.g. 0.45"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs text-stone-400 font-bold">ct</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Setting Style
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowStylesModal(true)}
                      className="text-[11px] font-bold text-[#b01622] hover:underline flex items-center gap-1 cursor-pointer"
                      title="Manage Setting Styles Master list"
                    >
                      <i className="fa-solid fa-plus text-[9px]"></i>
                      <span>Manage Styles</span>
                    </button>
                  </div>
                  <select
                    name="setting_style"
                    value={formData.setting_style}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 text-xs border border-stone-300 rounded-xl focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] focus:outline-hidden font-semibold bg-white"
                  >
                    {settingStyles.length > 0 ? (
                      settingStyles.map((s) => (
                        <option key={s.id || s.name} value={s.name}>
                          {s.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Prong Setting">Prong Setting</option>
                        <option value="Bezel Setting">Bezel Setting</option>
                        <option value="Channel Setting">Channel Setting</option>
                        <option value="Pave Setting">Pave Setting</option>
                        <option value="Micro Pave">Micro Pave</option>
                        <option value="Tension Setting">Tension Setting</option>
                        <option value="Antique Cast / Temple Work">Antique Cast / Temple Work</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Row 4: Making charges & Wastage */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Making Charge (₹/g)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="making_charge"
                      value={formData.making_charge}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 text-xs font-mono font-semibold border border-stone-300 rounded-xl focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] focus:outline-hidden"
                      placeholder="650"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs text-stone-400 font-bold">₹</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Wastage (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      name="wastage_percent"
                      value={formData.wastage_percent}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 text-xs font-mono font-semibold border border-stone-300 rounded-xl focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] focus:outline-hidden"
                      placeholder="3.50"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs text-stone-400 font-bold">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Initial Stock Qty
                  </label>
                  <input
                    type="number"
                    min="1"
                    name="stock_qty"
                    value={formData.stock_qty}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 text-xs font-mono font-semibold border border-stone-300 rounded-xl focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] focus:outline-hidden"
                    placeholder="1"
                  />
                </div>
              </div>

              {/* Row 5: Stamp, Unit, No. of Pieces, Weight */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Stamp
                  </label>
                  <select
                    name="stamp"
                    value={formData.stamp}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 text-xs border border-stone-300 rounded-xl focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] focus:outline-hidden font-semibold bg-white"
                  >
                    {['+0', '+1', '+2', '+3', '+4', '+5', '-1', '-2'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Unit
                  </label>
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 text-xs border border-stone-300 rounded-xl focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] focus:outline-hidden font-semibold bg-white"
                  >
                    {['Carat', 'Gram', 'Piece', 'Set', 'Pair'].map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    No. of Pieces
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="no_of_pieces"
                    value={formData.no_of_pieces}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 text-xs font-mono font-semibold border border-stone-300 rounded-xl focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] focus:outline-hidden"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Weight
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="weight"
                      value={formData.weight}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 text-xs font-mono font-semibold border border-stone-300 rounded-xl focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] focus:outline-hidden"
                      placeholder="0.00"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs text-stone-400 font-bold">g</span>
                  </div>
                </div>
              </div>

              {/* Row 6: Rate, Sale Rate, Sale Value */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Pricing & Valuation
                    </label>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
                      <i className="fa-solid fa-wand-magic-sparkles text-[9px]"></i>
                      Auto-Calculated
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetToAutoRates}
                    className="text-[11px] text-[#b01622] hover:text-[#8f1019] hover:underline font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    title="Recalculate rates automatically from bullion purity"
                  >
                    <i className="fa-solid fa-rotate-right text-[10px]"></i>
                    <span>Recalculate Auto Bullion</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Base Rate */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">
                      Base Metal Rate <span className="text-[10px] text-stone-400 font-normal">({formData.purity})</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        name="rate"
                        value={formData.rate}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 text-xs font-mono font-bold border border-stone-300 rounded-xl focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] focus:outline-hidden text-gray-900"
                        placeholder="6850"
                      />
                      <span className="absolute right-3.5 top-2.5 text-xs text-stone-400 font-bold">₹/g</span>
                    </div>
                    <span className="text-[10px] text-stone-400 mt-1 block">
                      Bullion rate per gram
                    </span>
                  </div>

                  {/* Sale Rate */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">
                      Sale Rate <span className="text-[10px] text-stone-400 font-normal">(incl. wastage & making)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        name="sale_rate"
                        value={formData.sale_rate}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 text-xs font-mono font-bold border border-stone-300 rounded-xl focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] focus:outline-hidden text-[#b01622]"
                        placeholder="0.00"
                      />
                      <span className="absolute right-3.5 top-2.5 text-xs text-stone-400 font-bold">₹/g</span>
                    </div>
                    <span className="text-[10px] text-stone-400 mt-1 block">
                      Base × (1 + {formData.wastage_percent}%) + ₹{formData.making_charge}
                    </span>
                  </div>

                  {/* Sale Value */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">
                      Total Sale Value <span className="text-[10px] text-stone-400 font-normal">(Est. Retail Price)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        name="sale_value"
                        value={formData.sale_value}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 text-xs font-mono font-bold border border-stone-300 rounded-xl focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] focus:outline-hidden text-emerald-700 bg-emerald-50/20"
                        placeholder="0.00"
                      />
                      <span className="absolute right-3.5 top-2.5 text-xs text-stone-400 font-bold">₹</span>
                    </div>
                    <span className="text-[10px] text-stone-400 mt-1 block">
                      Net wt ({formData.net_wt || formData.gross_wt || 0}g) × Sale Rate
                    </span>
                  </div>
                </div>

                {/* Calculation formula explanation banner */}
                <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 flex items-start gap-2.5 shadow-2xs">
                  <i className="fa-solid fa-calculator text-amber-700 mt-0.5 text-xs"></i>
                  <div>
                    <span className="font-bold text-amber-950">How Rate &amp; Price are Auto-Generated:</span>
                    <div className="mt-1 space-y-0.5 text-stone-700 text-[11px]">
                      <div>
                        &bull; <strong>Base Rate:</strong> Set from purity (<strong>{formData.purity}</strong> = <strong>₹{formData.rate || 6850}/g</strong>).
                      </div>
                      <div>
                        &bull; <strong>Sale Rate / Gram:</strong> Base Rate × (1 + {formData.wastage_percent}% Wastage) + ₹{formData.making_charge} Making Charge = <strong className="text-[#b01622]">₹{formData.sale_rate || 0}/g</strong>.
                      </div>
                      <div>
                        &bull; <strong>Total Sale Value:</strong> Net Weight ({formData.net_wt || formData.gross_wt || 0}g) × Sale Rate {formData.dia_wt_ct ? `+ Diamonds (${formData.dia_wt_ct}ct × ₹65,000)` : ''} = <strong className="text-emerald-700">₹{Number(formData.sale_value || 0).toLocaleString('en-IN')}</strong>.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 7: Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Item Description / Hallmarking Notes
                </label>
                <textarea
                  name="description"
                  rows="2"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-xs border border-stone-300 rounded-xl focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] focus:outline-hidden"
                  placeholder="e.g. BIS Hallmark certified, handcrafted filigree antique temple work with ruby accents..."
                ></textarea>
              </div>

              {/* Form Action Buttons */}
              <div className="pt-4 border-t border-stone-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    generateNewCode(category);
                    setFormData((prev) => ({
                      ...prev,
                      name: '',
                      gross_wt: '',
                      net_wt: '',
                      dia_wt_ct: '',
                      description: '',
                      no_of_pieces: '',
                      weight: '',
                      rate: '',
                      sale_rate: '',
                      sale_value: '',
                    }));
                    setImages([]);
                  }}
                  className="px-5 py-2.5 text-xs font-bold text-stone-600 hover:text-stone-900 border border-stone-300 hover:border-stone-400 rounded-xl transition-colors cursor-pointer"
                >
                  Reset Form
                </button>

                {/* "Upload New Product" button (Batch add) */}
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#b01622] hover:bg-[#8f1019] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <i className="fa-solid fa-plus text-xs"></i>
                  <span>Upload New Product</span>
                </button>
              </div>

            </div>

          </div>

        </form>

      {/* Quick Dropdown CRUD Modal for Setting Styles */}
      <QuickDropdownCrudModal
        isOpen={showStylesModal}
        onClose={() => setShowStylesModal(false)}
        type="setting_style"
        onItemSelect={(newStyleName) => {
          setFormData((prev) => ({ ...prev, setting_style: newStyleName }));
          fetchSettingStyles();
        }}
        onRefresh={fetchSettingStyles}
      />

      </div>
    </div>
  );
}
