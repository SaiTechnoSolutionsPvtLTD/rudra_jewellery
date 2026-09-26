import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { compressImageFile } from '../../utils/imageCompressor';
import QuickDropdownCrudModal from '../../components/QuickDropdownCrudModal';
import { STAMP_OPTIONS, STONE_SIZE_OPTIONS, STONE_COLOR_OPTIONS } from '../../constants/productOptions';
import { handleIntegerKeyDown, handleDecimalKeyDown, sanitizeInteger, sanitizeDecimal } from '../../utils/numberInputUtils';

export default function InventoryEditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const fileInputRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [styles, setStyles] = useState([]);
  const [showStylesModal, setShowStylesModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageError, setImageError] = useState(false);

  const refreshStyles = async () => {
    try {
      const res = await api.get('/styles');
      setStyles(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const [formData, setFormData] = useState({
    name: '',
    product_code: '',
    category_id: '',
    subcategory_id: '',
    gross_wt: '',
    net_wt: '',
    purity: '22K (91.6%)',
    size: '',
    setting_style: '',
    stamp: '+0',
    stone_size: '',
    stone_color: '',
    dia_wt_ct: '',
    wastage_percent: '3.50',
    making_charge: '650',
    stock_qty: 1,
    status: 'active',
    open_close_type: 'Close',
    description: '',
    image: '',
    variants: [],
  });

  const [newVariant, setNewVariant] = useState({
    sku: '',
    title: '',
    size: '',
    color: '',
    net_wt: '',
    stock_qty: '1',
    price: '',
    stone_size: '',
    stone_color: '',
  });

  const handleAddVariant = () => {
    if (!newVariant.title && !newVariant.size && !newVariant.color) {
      showToast('Please specify a title, size, or color for the variant', 'warning');
      return;
    }
    const variantItem = {
      id: Date.now(),
      sku: newVariant.sku || `${formData.product_code || 'RJ'}-V${(formData.variants?.length || 0) + 1}`,
      title: newVariant.title || `${newVariant.size ? 'Size ' + newVariant.size : ''} ${newVariant.color ? newVariant.color : ''}`.trim() || `Variant #${(formData.variants?.length || 0) + 1}`,
      size: newVariant.size || '',
      color: newVariant.color || '',
      stone_size: newVariant.stone_size || formData.stone_size || '',
      stone_color: newVariant.stone_color || formData.stone_color || '',
      net_wt: newVariant.net_wt || formData.net_wt || '',
      stock_qty: newVariant.stock_qty || '1',
      price: newVariant.price || '',
    };
    setFormData(prev => ({
      ...prev,
      variants: [...(prev.variants || []), variantItem]
    }));
    setNewVariant({
      sku: '',
      title: '',
      size: '',
      color: '',
      net_wt: '',
      stock_qty: '1',
      price: '',
      stone_size: '',
      stone_color: '',
    });
    showToast('Variant added to product model!', 'success');
  };

  const handleRemoveVariant = (variantId) => {
    setFormData(prev => ({
      ...prev,
      variants: (prev.variants || []).filter(v => v.id !== variantId)
    }));
  };

  const [imageUrls, setImageUrls] = useState([]);

  useEffect(() => {
    fetchInitialData();
  }, [id]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes, stylesRes] = await Promise.all([
        api.get(`/inventory/products/${id}`),
        api.get('/categories'),
        api.get('/styles').catch(() => ({ data: [] })),
      ]);

      const p = prodRes.data.product;
      const attrs = prodRes.data.attributes || {};
      const rawImgs = prodRes.data.images || [];
      const validImgs = rawImgs.filter(
        (img) =>
          img &&
          typeof img === 'string' &&
          img !== '/placeholder-jewelry.png' &&
          !img.includes('/storage/data:image') &&
          img.trim() !== '1' &&
          img.length > 5
      );

      setCategories(catRes.data || []);
      setStyles(stylesRes.data || []);
      setImageUrls(validImgs);

      // Load subcategories for product's category
      if (p.category_id) {
        const cat = (catRes.data || []).find((c) => c.id === p.category_id);
        setSubcategories(cat?.subcategories || []);
      }

      let parsedVariants = [];
      if (attrs.variants) {
        parsedVariants = typeof attrs.variants === 'string' ? JSON.parse(attrs.variants || '[]') : (Array.isArray(attrs.variants) ? attrs.variants : []);
      }

      setFormData({
        name: p.name || '',
        product_code: p.product_code || '',
        category_id: p.category_id || '',
        subcategory_id: p.subcategory_id || '',
        gross_wt: attrs.gross_wt || p.opening_stock_weight || '',
        net_wt: attrs.net_wt || p.opening_fine_weight || '',
        purity: attrs.purity || attrs.gold_type || '22K (91.6%)',
        size: attrs.size || '',
        setting_style: attrs.setting_style || '',
        stamp: attrs.stamp || '+0',
        stone_size: attrs.stone_size || '',
        stone_color: attrs.stone_color || '',
        dia_wt_ct: attrs.dia_wt_ct || attrs.diamond_wt || '',
        wastage_percent: attrs.wastage_percent || '3.50',
        making_charge: attrs.making_charge || '650',
        stock_qty: p.current_stock_qty ?? 1,
        status: p.status || 'active',
        open_close_type: attrs.open_close_type || 'Close',
        description: p.description || '',
        image: p.image || validImgs[0] || '',
        variants: parsedVariants,
      });
    } catch (err) {
      console.error('Failed to load product data:', err);
      showToast('Failed to load product details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (e) => {
    const catId = e.target.value;
    setFormData((prev) => ({ ...prev, category_id: catId, subcategory_id: '' }));
    const selected = categories.find((c) => String(c.id) === String(catId));
    setSubcategories(selected?.subcategories || []);
  };

  // Handle file upload for multiple images
  const handleFileUpload = (e) => {
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
          setImageUrls((prev) => {
            const cleanPrev = prev.filter(
              (img) =>
                img &&
                typeof img === 'string' &&
                img !== '/placeholder-jewelry.png' &&
                !img.includes('/storage/data:image') &&
                img.trim() !== '1' &&
                img.length > 5
            );
            const combined = [...cleanPrev, ...successful];
            setFormData((f) => ({ ...f, image: combined[0] || '' }));
            return combined;
          });
          setImageError(false);
          showToast(`Added ${successful.length} image(s). 1st image is Thumbnail, others are Child images.`, 'success');
        }
      })
      .catch((err) => {
        console.error('Image compression error', err);
        showToast('Failed to process image(s)', 'error');
      });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Promote any child image to primary thumbnail (index 0)
  const handleSetAsThumb = (index) => {
    if (index === 0) return;
    setImageUrls((prev) => {
      const copy = [...prev];
      const [chosen] = copy.splice(index, 1);
      copy.unshift(chosen);
      setFormData((f) => ({ ...f, image: chosen }));
      return copy;
    });
    showToast('Image set as primary thumbnail', 'info');
  };

  const handleRemoveImage = (index) => {
    setImageUrls((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      setFormData((f) => ({ ...f, image: filtered[0] || '' }));
      return filtered;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Product name is required', 'error');
      return;
    }

    if (!imageUrls || imageUrls.length === 0) {
      setImageError(true);
      showToast('Product image is required! Please upload at least one image.', 'error');
      const dropzone = document.getElementById('edit-image-upload-section');
      if (dropzone) dropzone.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSaving(true);
    try {
      await api.put(`/inventory/products/${id}`, {
        ...formData,
        image: imageUrls[0],
        thumb_image: imageUrls[0],
        child_images: imageUrls.slice(1),
        images: imageUrls,
      });

      showToast(`Product "${formData.name}" updated successfully!`, 'success', 'Inventory Updated');
      navigate('/inventory');
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to update product', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-80 text-stone-400">
        <i className="fa-solid fa-circle-notch fa-spin text-2xl text-[#b01622] mr-3"></i>
        <span className="text-sm font-semibold">Loading product for editing...</span>
      </div>
    );
  }

  return (
    <div className="w-full pb-14 space-y-6 font-['Inter',-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif] max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-1">
            <Link to="/inventory" className="hover:text-gray-900 transition-colors">Inventory</Link>
            <span>›</span>
            <span>Edit Product</span>
            <span>›</span>
            <span className="text-[#b01622] font-mono font-bold">{formData.product_code}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Edit Inventory Product</h1>
        </div>
        <Link
          to="/inventory"
          className="px-4 py-2 bg-white border border-stone-300 hover:border-stone-400 text-stone-700 text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-2"
        >
          <i className="fa-solid fa-arrow-left text-xs"></i>
          <span>Cancel & Back</span>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden">
        
        {/* Banner */}
        <div className="bg-gradient-to-r from-[#b01622] to-[#8f1019] text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold tracking-wide uppercase">Modify Product Specifications</h2>
            <p className="text-[11px] text-red-100 mt-0.5">Update bullion weights, stone counts and catalog status</p>
          </div>
          <span className="font-mono text-xs font-bold bg-white/20 px-3 py-1 rounded-full border border-white/30">
            {formData.product_code}
          </span>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Row 1: Name & SKU */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#b01622] focus:bg-white"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
                Product Code / SKU <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.product_code}
                onChange={(e) => setFormData({ ...formData, product_code: e.target.value })}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#b01622] focus:bg-white"
                required
              />
            </div>
          </div>

          {/* Row 2: Category & Subcategory */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category_id}
                onChange={handleCategoryChange}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#b01622] focus:bg-white"
                required
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
                Subcategory
              </label>
              <select
                value={formData.subcategory_id}
                onChange={(e) => setFormData({ ...formData, subcategory_id: e.target.value })}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#b01622] focus:bg-white"
              >
                <option value="">Select Subcategory (Optional)</option>
                {subcategories.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Gross Wt, Net Wt, Purity, Setting Style */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
                Gross Weight (g) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.001"
                value={formData.gross_wt}
                onChange={(e) => setFormData({ ...formData, gross_wt: e.target.value })}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#b01622] focus:bg-white"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
                Net Weight (g)
              </label>
              <input
                type="number"
                step="0.001"
                value={formData.net_wt}
                onChange={(e) => setFormData({ ...formData, net_wt: e.target.value })}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#b01622] focus:bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
                Gold Purity / Karat
              </label>
              <select
                value={formData.purity}
                onChange={(e) => setFormData({ ...formData, purity: e.target.value })}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#b01622] focus:bg-white"
              >
                <option value="24K (99.9% Pure)">24K (99.9% Pure)</option>
                <option value="22K (91.6%)">22K (91.6% Standard)</option>
                <option value="18K (75.0%)">18K (75.0% Jewel)</option>
                <option value="14K (58.5%)">14K (58.5% Fashion)</option>
                <option value="925 Sterling Silver">925 Sterling Silver</option>
                <option value="950 Platinum">950 Platinum</option>
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
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
                value={formData.setting_style}
                onChange={(e) => setFormData({ ...formData, setting_style: e.target.value })}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#b01622] focus:bg-white"
              >
                <option value="">Select Setting Style</option>
                {styles && styles.length > 0 ? (
                  styles.map((s) => (
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

          {/* Row 4: Diamond Carats, Wastage %, Making Charge, Classification */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
                Diamond Weight (Cts)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.dia_wt_ct}
                onChange={(e) => setFormData({ ...formData, dia_wt_ct: e.target.value })}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#b01622] focus:bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
                Standard Wastage (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.wastage_percent}
                onChange={(e) => setFormData({ ...formData, wastage_percent: e.target.value })}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#b01622] focus:bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
                Making Charge (₹/g)
              </label>
              <input
                type="number"
                value={formData.making_charge}
                onChange={(e) => setFormData({ ...formData, making_charge: e.target.value })}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#b01622] focus:bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
                Open / Close Form
              </label>
              <select
                value={formData.open_close_type}
                onChange={(e) => setFormData({ ...formData, open_close_type: e.target.value })}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-[#b01622] focus:outline-none focus:border-[#b01622] focus:bg-white"
              >
                <option value="Close">Close</option>
                <option value="Open">Open</option>
                <option value="Open Close">Open Close</option>
              </select>
            </div>
          </div>

          {/* Row 4.5: Product Size, Stone Size, Stone Colour & Stamp / Hallmark */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
                Product Size / Length
              </label>
              <input
                type="text"
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                placeholder="e.g. Ring 16 / Bangle 2.4"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#b01622] focus:bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
                Stone Size / Pointer
              </label>
              <select
                value={formData.stone_size}
                onChange={(e) => setFormData({ ...formData, stone_size: e.target.value })}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#b01622] focus:bg-white"
              >
                <option value="">Select Stone Size / Range</option>
                {STONE_SIZE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
                Stone Colour / Gemstone
              </label>
              <select
                value={formData.stone_color}
                onChange={(e) => setFormData({ ...formData, stone_color: e.target.value })}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#b01622] focus:bg-white"
              >
                <option value="">Select Stone Colour / Type</option>
                {STONE_COLOR_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
                Stamp / Hallmark
              </label>
              <select
                value={formData.stamp}
                onChange={(e) => setFormData({ ...formData, stamp: e.target.value })}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#b01622] focus:bg-white"
              >
                {STAMP_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 5: Stock Quantity & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
                In-Stock Quantity
              </label>
              <input
                type="number"
                min="0"
                value={formData.stock_qty}
                onChange={(e) => setFormData({ ...formData, stock_qty: e.target.value })}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#b01622] focus:bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#b01622] focus:bg-white"
              >
                <option value="active">Active (Available for orders)</option>
                <option value="inactive">Inactive (Hidden from catalog)</option>
              </select>
            </div>
          </div>

          {/* Product Model Variants Manager */}
          <div className="p-4 bg-stone-50/80 border border-stone-200/80 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-layer-group text-[#b01622] text-sm"></i>
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Product Model Variants ({formData.variants?.length || 0})
                </h4>
              </div>
              <span className="text-[10px] text-stone-500 font-medium">
                Store different sizes, metal colors &amp; stone variants under this model
              </span>
            </div>

            {/* Inline Variant Creation Form */}
            <div className="bg-white p-3 rounded-xl border border-stone-200 space-y-3 shadow-2xs">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-stone-600 mb-1">
                    Variant Code / SKU
                  </label>
                  <input
                    type="text"
                    value={newVariant.sku}
                    onChange={(e) => setNewVariant({ ...newVariant, sku: e.target.value })}
                    placeholder={`Ex: ${formData.product_code || 'SKU'}-V1`}
                    className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg focus:border-[#b01622] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-600 mb-1">
                    Variant Title / Option
                  </label>
                  <input
                    type="text"
                    value={newVariant.title}
                    onChange={(e) => setNewVariant({ ...newVariant, title: e.target.value })}
                    placeholder="Ex: Ring Size 14 - Rose Gold"
                    className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg focus:border-[#b01622]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-600 mb-1">
                    Size (Ring / Bangle)
                  </label>
                  <input
                    type="text"
                    value={newVariant.size}
                    onChange={(e) => setNewVariant({ ...newVariant, size: e.target.value })}
                    placeholder="Ex: 14 or 2-4"
                    className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg focus:border-[#b01622]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-600 mb-1">
                    Metal / Finish Colour
                  </label>
                  <input
                    type="text"
                    value={newVariant.color}
                    onChange={(e) => setNewVariant({ ...newVariant, color: e.target.value })}
                    placeholder="Ex: Yellow Gold / Rose Gold"
                    className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg focus:border-[#b01622]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end">
                <div>
                  <label className="block text-[10px] font-bold text-stone-600 mb-1 whitespace-nowrap overflow-hidden text-ellipsis">
                    Net Wt (g)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    inputMode="decimal"
                    onKeyDown={handleDecimalKeyDown}
                    value={newVariant.net_wt}
                    onChange={(e) => setNewVariant({ ...newVariant, net_wt: sanitizeDecimal(e.target.value) })}
                    placeholder={formData.net_wt || "0.000"}
                    className="w-full px-2.5 py-1.5 h-[34px] text-xs border border-stone-300 rounded-lg focus:border-[#b01622] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-600 mb-1 whitespace-nowrap overflow-hidden text-ellipsis">
                    Stock Qty
                  </label>
                  <input
                    type="number"
                    min="1"
                    inputMode="numeric"
                    onKeyDown={handleIntegerKeyDown}
                    value={newVariant.stock_qty}
                    onChange={(e) => setNewVariant({ ...newVariant, stock_qty: sanitizeInteger(e.target.value) })}
                    placeholder="1"
                    className="w-full px-2.5 py-1.5 h-[34px] text-xs border border-stone-300 rounded-lg focus:border-[#b01622] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-600 mb-1 whitespace-nowrap overflow-hidden text-ellipsis" title="Price Override (₹)">
                    Price Override (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    onKeyDown={handleDecimalKeyDown}
                    value={newVariant.price}
                    onChange={(e) => setNewVariant({ ...newVariant, price: sanitizeDecimal(e.target.value) })}
                    placeholder="0"
                    className="w-full px-2.5 py-1.5 h-[34px] text-xs border border-stone-300 rounded-lg focus:border-[#b01622] font-mono text-emerald-700"
                  />
                </div>
                <div>
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="w-full h-[34px] px-2.5 bg-[#b01622] hover:bg-[#8f1019] text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap"
                  >
                    <i className="fa-solid fa-plus text-[10px]"></i>
                    <span>Add Variant</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Table of Added Variants */}
            {formData.variants && formData.variants.length > 0 && (
              <div className="overflow-x-auto bg-white rounded-xl border border-stone-200">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[9px]">
                      <th className="py-2 px-3">SKU</th>
                      <th className="py-2 px-3">Variant Title</th>
                      <th className="py-2 px-3">Size / Colour</th>
                      <th className="py-2 px-3 text-right">Net Wt</th>
                      <th className="py-2 px-3 text-center">Stock</th>
                      <th className="py-2 px-3 text-right">Price</th>
                      <th className="py-2 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {formData.variants.map((varItem) => (
                      <tr key={varItem.id} className="hover:bg-stone-50/60">
                        <td className="py-2 px-3 font-mono font-bold text-gray-900">{varItem.sku}</td>
                        <td className="py-2 px-3 font-semibold text-stone-800">{varItem.title}</td>
                        <td className="py-2 px-3">
                          {varItem.size && <span className="px-1.5 py-0.5 mr-1 bg-stone-100 border border-stone-200 rounded text-[10px] font-bold">Size: {varItem.size}</span>}
                          {varItem.color && <span className="px-1.5 py-0.5 bg-red-50 text-[#b01622] border border-red-100 rounded text-[10px] font-bold">{varItem.color}</span>}
                        </td>
                        <td className="py-2 px-3 text-right font-mono">{varItem.net_wt ? `${varItem.net_wt}g` : '-'}</td>
                        <td className="py-2 px-3 text-center font-bold">{varItem.stock_qty}</td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-700 font-bold">{varItem.price ? `₹${Number(varItem.price).toLocaleString('en-IN')}` : '-'}</td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(varItem.id)}
                            className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                            title="Remove Variant"
                          >
                            <i className="fa-solid fa-trash-can text-xs"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Image Gallery Manager */}
          <div id="edit-image-upload-section" className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">Product Images Gallery</span>
                <span className="text-red-500 font-bold">*</span>
              </div>
              <span className="text-[10px] text-stone-400 font-medium whitespace-nowrap">
                1st image = Thumb, others = Child
              </span>
            </div>

            {/* Upload Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px] ${
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
                onChange={handleFileUpload}
              />
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg mb-2 ${
                imageError ? 'bg-red-100 text-red-600' : 'bg-red-100/60 text-[#b01622]'
              }`}>
                <i className="fa-solid fa-cloud-arrow-up"></i>
              </div>
              <h4 className="text-xs font-bold text-gray-900">
                {imageUrls.length > 0 ? '+ Upload More Product Photos' : 'Upload Product Photos *'}
              </h4>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Drag and drop or click to browse image files (PNG, JPG, WEBP)
              </p>
            </div>

            {/* Error banner if no images */}
            {imageError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2">
                <i className="fa-solid fa-circle-exclamation text-sm text-red-600"></i>
                <span>Product image is required! Please upload at least one image.</span>
              </div>
            )}

            {/* Thumbnails list */}
            {imageUrls.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                    <i className="fa-solid fa-images text-[#b01622] text-xs"></i>
                    <span>Uploaded Images ({imageUrls.length})</span>
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[11px] text-[#b01622] hover:underline font-semibold cursor-pointer"
                    >
                      + Add More Photos
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setImageUrls([]);
                        setFormData((f) => ({ ...f, image: '' }));
                      }}
                      className="text-[11px] text-stone-500 hover:text-red-600 hover:underline font-semibold cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {imageUrls.map((url, idx) => (
                    <div
                      key={idx}
                      className={`relative group rounded-xl overflow-hidden border shadow-2xs aspect-square bg-stone-100 ${
                        idx === 0 ? 'border-2 border-[#b01622] ring-2 ring-red-100' : 'border-stone-200'
                      }`}
                    >
                      <img
                        src={url}
                        alt={idx === 0 ? 'Main Thumbnail' : `Child #${idx}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/placeholder-jewelry.png';
                        }}
                      />

                      {/* First Image: Thumb Badge */}
                      {idx === 0 ? (
                        <span className="absolute top-1 left-1 bg-[#b01622] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs flex items-center gap-1 z-10">
                          <i className="fa-solid fa-star text-[8px] text-amber-300"></i> Thumb
                        </span>
                      ) : (
                        /* Child Images: Child Badge + Set as Thumb button */
                        <>
                          <span className="absolute top-1 left-1 bg-black/75 text-white text-[8px] font-semibold px-1.5 py-0.5 rounded z-10">
                            Child #{idx}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetAsThumb(idx);
                            }}
                            className="absolute bottom-1 left-1 right-1 text-[9px] bg-white hover:bg-[#b01622] text-stone-800 hover:text-white font-bold py-1 rounded shadow text-center transition-colors cursor-pointer z-10 border border-stone-200"
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
                        title="Remove photo"
                      >
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                  ))}
                </div>

                <div className="p-2.5 bg-stone-50 border border-stone-200/80 rounded-xl text-[11px] text-stone-600 flex items-start gap-2">
                  <i className="fa-solid fa-circle-info text-[#b01622] text-xs mt-0.5"></i>
                  <span>
                    <strong>1st image</strong> is the catalog <strong>Thumbnail</strong>. Additional images are saved as <strong>Child/Gallery images</strong>. Click &ldquo;Set as Thumb&rdquo; on any child photo to make it primary.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
              Description & Specifications Notes
            </label>
            <textarea
              rows="3"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter product crafting notes, hallmarking details, or artisan specifications..."
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-[#b01622] focus:bg-white"
            />
          </div>

        </div>

        {/* Form Footer Buttons */}
        <div className="p-6 bg-stone-50 border-t border-stone-100 flex items-center justify-end gap-3">
          <Link
            to="/inventory"
            className="px-5 py-2.5 bg-white border border-stone-300 text-stone-700 hover:bg-stone-100 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-[#b01622] hover:bg-[#8f1019] text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving && <i className="fa-solid fa-circle-notch fa-spin"></i>}
            <span>Save & Update Product</span>
          </button>
        </div>

      </form>

      {/* Quick Dropdown CRUD Modal for Setting Styles */}
      <QuickDropdownCrudModal
        isOpen={showStylesModal}
        onClose={() => setShowStylesModal(false)}
        type="setting_style"
        onItemSelect={(newStyleName) => {
          setFormData((prev) => ({ ...prev, setting_style: newStyleName }));
          refreshStyles();
        }}
        onRefresh={refreshStyles}
      />

    </div>
  );
}
