import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { compressImageFile } from '../../utils/imageCompressor';

export default function InventoryEditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const fileInputRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [styles, setStyles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageError, setImageError] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    product_code: '',
    category_id: '',
    subcategory_id: '',
    gross_wt: '',
    net_wt: '',
    purity: '22K (91.6%)',
    setting_style: '',
    dia_wt_ct: '',
    wastage_percent: '3.50',
    making_charge: '650',
    stock_qty: 1,
    status: 'active',
    open_close_type: 'Close',
    description: '',
    image: '',
  });

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

      setFormData({
        name: p.name || '',
        product_code: p.product_code || '',
        category_id: p.category_id || '',
        subcategory_id: p.subcategory_id || '',
        gross_wt: attrs.gross_wt || p.opening_stock_weight || '',
        net_wt: attrs.net_wt || p.opening_fine_weight || '',
        purity: attrs.purity || attrs.gold_type || '22K (91.6%)',
        setting_style: attrs.setting_style || '',
        dia_wt_ct: attrs.dia_wt_ct || attrs.diamond_wt || '',
        wastage_percent: attrs.wastage_percent || '3.50',
        making_charge: attrs.making_charge || '650',
        stock_qty: p.current_stock_qty ?? 1,
        status: p.status || 'active',
        open_close_type: attrs.open_close_type || 'Close',
        description: p.description || '',
        image: p.image || imgs[0] || '',
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
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
                Setting Style
              </label>
              <input
                type="text"
                value={formData.setting_style}
                onChange={(e) => setFormData({ ...formData, setting_style: e.target.value })}
                placeholder="e.g. Prong, Bezel, Pave"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#b01622] focus:bg-white"
              />
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

          {/* Image Gallery Manager */}
          <div id="edit-image-upload-section" className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                Product Images Gallery <span className="text-red-500 font-bold">*</span>
              </label>
              <span className="text-[10px] text-stone-400 font-medium">
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

    </div>
  );
}
