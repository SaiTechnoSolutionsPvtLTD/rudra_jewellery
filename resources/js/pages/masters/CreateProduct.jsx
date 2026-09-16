import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function CreateProduct() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const TOUCH_OPTIONS = [
    { label: '100% (24K Pure)', value: 100 },
    { label: '99.9% (999 Fine Gold)', value: 99.9 },
    { label: '99.5% (995 Fine Gold)', value: 99.5 },
    { label: '92.0% (92 Touch)', value: 92 },
    { label: '91.6% (22K / 916 Hallmark)', value: 91.6 },
    { label: '90.0% (90 Touch)', value: 90 },
    { label: '85.0% (85 Touch)', value: 85 },
    { label: '83.3% (20K / 833)', value: 83.3 },
    { label: '80.0% (80 Touch)', value: 80 },
    { label: '75.0% (18K / 750)', value: 75 },
    { label: '70.0% (70 Touch)', value: 70 },
    { label: '58.5% (14K / 585)', value: 58.5 },
    { label: '50.0% (50 Touch)', value: 50 },
    { label: '37.5% (9K / 375)', value: 37.5 },
  ];

  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingSku, setGeneratingSku] = useState(false);
  const [isCustomTouch, setIsCustomTouch] = useState(false);

  const [formData, setFormData] = useState({
    category_id: '',
    subcategory_id: '',
    name: '',
    product_code: '',
    description: '',
    opening_stock_qty: 0,
    opening_stock_weight: '',
    opening_touch: 100,
    opening_fine_weight: '',
    opening_stock_rate: '',
    opening_stock_date: '',
    status: 'active',
    attributes: {}
  });

  // File objects for upload
  const [imageFile, setImageFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);

  // Preview URLs
  const [imagePreview, setImagePreview] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);

  const fetchSku = async (catId, subId) => {
    try {
      setGeneratingSku(true);
      const res = await api.get('/products/generate-sku', {
        params: { category_id: catId, subcategory_id: subId }
      });
      if (res.data && res.data.product_code) {
        setFormData(prev => ({ ...prev, product_code: res.data.product_code }));
      }
    } catch (err) {
      console.error('Error generating SKU:', err);
    } finally {
      setGeneratingSku(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [catRes, subRes] = await Promise.all([
        api.get('/categories'),
        api.get('/subcategories')
      ]);
      setCategories(catRes.data);
      setSubcategories(subRes.data);

      if (isEditMode) {
        const prodRes = await api.get(`/products/${id}`);
        const item = prodRes.data;
        const cat = catRes.data.find(c => String(c.id) === String(item.category_id));
        const schema = cat?.form_schema || [];
        const defaultAttrs = initializeDefaultAttributes(schema);

        setFormData({
          category_id: item.category_id || '',
          subcategory_id: item.subcategory_id || '',
          name: item.name || '',
          product_code: item.product_code || '',
          description: item.description || '',
          opening_stock_qty: item.opening_stock_qty ?? 0,
          opening_stock_weight: item.opening_stock_weight ?? '',
          opening_touch: item.opening_touch ?? 100,
          opening_fine_weight: item.opening_fine_weight ?? '',
          opening_stock_rate: item.opening_stock_rate ?? '',
          opening_stock_date: item.opening_stock_date ?? '',
          status: item.status || 'active',
          attributes: { ...defaultAttrs, ...(item.attributes || {}) }
        });

        if (item.image_url) setImagePreview(item.image_url);
        if (item.thumbnail_url) setThumbnailPreview(item.thumbnail_url);
      } else if (catRes.data.length > 0) {
        const initialCatId = catRes.data[0].id;
        const initialSchema = catRes.data[0].form_schema || [];
        setFormData(prev => ({
          ...prev,
          category_id: initialCatId,
          attributes: initializeDefaultAttributes(initialSchema)
        }));
        fetchSku(initialCatId, '');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load form data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const initializeDefaultAttributes = (schema) => {
    const defaults = {};
    if (Array.isArray(schema)) {
      schema.forEach(field => {
        if (field.type === 'select' && field.options && field.options.length > 0) {
          defaults[field.key] = field.options[0];
        } else if (field.type === 'checkbox') {
          defaults[field.key] = false;
        } else {
          defaults[field.key] = '';
        }
      });
    }
    return defaults;
  };

  const getActiveFormSchema = () => {
    const selectedSub = subcategories.find(s => String(s.id) === String(formData.subcategory_id));
    if (selectedSub && selectedSub.form_schema && selectedSub.form_schema.length > 0) {
      return selectedSub.form_schema;
    }

    const selectedCat = categories.find(c => String(c.id) === String(formData.category_id));
    if (selectedCat && selectedCat.form_schema && selectedCat.form_schema.length > 0) {
      return selectedCat.form_schema;
    }

    return [];
  };

  const handleCategoryChange = (e) => {
    const newCatId = e.target.value;
    const cat = categories.find(c => String(c.id) === String(newCatId));
    const schema = cat?.form_schema || [];

    setFormData(prev => ({
      ...prev,
      category_id: newCatId,
      subcategory_id: '',
      attributes: initializeDefaultAttributes(schema)
    }));

    if (!isEditMode) {
      fetchSku(newCatId, '');
    }
  };

  const handleSubcategoryChange = (e) => {
    const newSubId = e.target.value;
    const sub = subcategories.find(s => String(s.id) === String(newSubId));
    const cat = categories.find(c => String(c.id) === String(formData.category_id));
    
    const schema = (sub && sub.form_schema && sub.form_schema.length > 0) 
      ? sub.form_schema 
      : (cat?.form_schema || []);

    setFormData(prev => ({
      ...prev,
      subcategory_id: newSubId,
      attributes: {
        ...initializeDefaultAttributes(schema),
        ...prev.attributes
      }
    }));

    if (!isEditMode) {
      fetchSku(formData.category_id, newSubId);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'product_code') {
      setFormData(prev => ({ ...prev, [name]: value.toUpperCase() }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAttributeChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        [key]: value
      }
    }));
  };

  // Image Upload Handlers
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const removeThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.category_id) {
      showToast('Please select a Category', 'error', 'Validation Error');
      return;
    }
    if (!formData.name.trim()) {
      showToast('Please enter a Product Name', 'error', 'Validation Error');
      return;
    }
    if (!formData.product_code.trim()) {
      showToast('Please enter a Product Code / SKU', 'error', 'Validation Error');
      return;
    }

    setSaving(true);

    try {
      const payload = new FormData();
      payload.append('category_id', formData.category_id);
      if (formData.subcategory_id) payload.append('subcategory_id', formData.subcategory_id);
      payload.append('name', formData.name);
      payload.append('product_code', formData.product_code);
      payload.append('description', formData.description || '');
      payload.append('opening_stock_qty', formData.opening_stock_qty || 0);
      payload.append('opening_stock_weight', formData.opening_stock_weight || 0);

      const selCat = categories.find(c => String(c.id) === String(formData.category_id));
      const catCode = selCat?.code?.toUpperCase() || '';
      const catName = selCat?.name?.toLowerCase() || '';
      const isDiamond = catCode === 'DIAMOND' || catName.includes('diamond');

      if (isDiamond) {
        payload.append('opening_touch', 100);
        const computedFineWt = parseFloat(formData.opening_stock_weight || 0) * 0.2;
        payload.append('opening_fine_weight', computedFineWt.toFixed(3));
      } else {
        payload.append('opening_touch', formData.opening_touch || 100);
        const computedFineWt = parseFloat(formData.opening_stock_weight || 0) * (parseFloat(formData.opening_touch || 100) / 100);
        payload.append('opening_fine_weight', computedFineWt.toFixed(3));
      }
      payload.append('opening_stock_rate', formData.opening_stock_rate || 0);
      if (formData.opening_stock_date) payload.append('opening_stock_date', formData.opening_stock_date);
      payload.append('status', formData.status || 'active');
      payload.append('attributes', JSON.stringify(formData.attributes || {}));
      if (formData.attributes && typeof formData.attributes === 'object') {
        Object.entries(formData.attributes).forEach(([k, v]) => {
          payload.append(`attributes[${k}]`, v !== null && v !== undefined ? v : '');
        });
      }

      if (imageFile) {
        payload.append('image', imageFile);
      }
      if (thumbnailFile) {
        payload.append('thumbnail', thumbnailFile);
      }

      if (isEditMode) {
        payload.append('_method', 'PUT');
        await api.post(`/products/${id}`, payload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        showToast('Product updated successfully!', 'success', 'Updated');
      } else {
        await api.post('/products', payload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        showToast('New Product created successfully!', 'success', 'Created');
      }

      navigate('/inventory');
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || 'Error saving product details.';
      showToast(errorMsg, 'error', 'Operation Failed');
    } finally {
      setSaving(false);
    }
  };

  const filteredSubcategories = subcategories.filter(
    s => String(s.category_id) === String(formData.category_id)
  );

  const activeSchema = getActiveFormSchema();

  const selectedCategory = categories.find(c => String(c.id) === String(formData.category_id));
  const categoryCode = selectedCategory?.code?.toUpperCase() || '';
  const categoryName = selectedCategory?.name?.toLowerCase() || '';
  const isDiamondCategory = categoryCode === 'DIAMOND' || categoryName.includes('diamond');

  if (loading) {
    return (
      <div className="w-full py-12 text-center text-gray-400">
        <i className="fa-solid fa-circle-notch fa-spin mr-2 text-xl"></i> Loading form data...
      </div>
    );
  }

  return (
    <div className="w-full pb-16">
      
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
            MASTERS <span className="text-gray-300 mx-1">▸</span> PRODUCTS <span className="text-gray-300 mx-1">▸</span> <span className="text-gray-500">{isEditMode ? 'EDIT PRODUCT' : 'CREATE PRODUCT'}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{isEditMode ? 'Edit Product Details' : 'Create New Product'}</h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/inventory"
            className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-arrow-left text-xs"></i>
            Back to Inventory List
          </Link>
        </div>
      </div>

      {/* Main Form Container */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* CARD 1: Basic Information */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100 text-sm font-bold text-gray-900">
            <i className="fa-solid fa-circle-info text-[#b01622]"></i>
            <span>Basic Product Information</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Category Selection */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleCategoryChange}
                required
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors"
              >
                <option value="">-- Select Category --</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({cat.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Subcategory Selection */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">
                Subcategory
              </label>
              <select
                name="subcategory_id"
                value={formData.subcategory_id}
                onChange={handleSubcategoryChange}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors"
              >
                <option value="">-- Select Subcategory (Optional) --</option>
                {filteredSubcategories.map(sub => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} ({sub.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Product Name */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-2">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g. 22K Traditional Antique Gold Necklace"
                required
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors"
              />
            </div>

            {/* Product Code / SKU */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-gray-700">
                  Product Code / SKU <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => fetchSku(formData.category_id, formData.subcategory_id)}
                  disabled={generatingSku}
                  className="text-[11px] font-bold text-[#b01622] hover:text-[#90121b] flex items-center gap-1 cursor-pointer transition-colors"
                  title="Auto generate fresh Product Code / SKU"
                >
                  <i className={`fa-solid fa-arrows-rotate text-[10px] ${generatingSku ? 'fa-spin' : ''}`}></i>
                  Auto Generate
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  name="product_code"
                  value={formData.product_code}
                  onChange={handleInputChange}
                  placeholder="e.g. PRD-GOLD-0001"
                  required
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-mono text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors"
                />
                {generatingSku && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                    <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="w-full md:w-1/3">
            <label className="block text-xs font-bold text-gray-700 mb-2">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* CARD 2: Product Images & Thumbnail Upload */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <i className="fa-regular fa-image text-[#b01622]"></i>
              <span>Product Image & Thumbnail Upload</span>
            </div>
            <span className="text-xs text-gray-400 font-normal">Supports JPG, PNG, WEBP (Max 5MB)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Main Product Image Upload */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-700">
                Main Product Image
              </label>
              {imagePreview ? (
                <div className="relative group w-full h-48 rounded-xl border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
                  <img src={imagePreview} alt="Main Product Preview" className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={removeImage}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <i className="fa-solid fa-trash-can"></i> Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-[#b01622] hover:bg-red-50/20 transition-all">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                    <div className="w-10 h-10 rounded-full bg-red-50 text-[#b01622] flex items-center justify-center mb-2">
                      <i className="fa-solid fa-[#b01622] fa-cloud-arrow-up text-lg"></i>
                    </div>
                    <p className="text-xs font-bold text-gray-700 mb-1">Click to upload Main Image</p>
                    <p className="text-[11px] text-gray-400">High resolution product photo</p>
                  </div>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              )}
            </div>

            {/* Thumbnail Image Upload */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-700">
                Product Thumbnail Image
              </label>
              {thumbnailPreview ? (
                <div className="relative group w-full h-48 rounded-xl border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
                  <img src={thumbnailPreview} alt="Thumbnail Preview" className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={removeThumbnail}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <i className="fa-solid fa-trash-can"></i> Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-[#b01622] hover:bg-red-50/20 transition-all">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                    <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
                      <i className="fa-solid fa-photo-film text-lg"></i>
                    </div>
                    <p className="text-xs font-bold text-gray-700 mb-1">Click to upload Thumbnail</p>
                    <p className="text-[11px] text-gray-400">Small square icon / table preview</p>
                  </div>
                  <input type="file" accept="image/*" onChange={handleThumbnailChange} className="hidden" />
                </label>
              )}
            </div>

          </div>
        </div>

        {/* CARD 3: Dynamic Category Custom Form Attributes */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <i className="fa-solid fa-sliders text-[#b01622]"></i>
              <span>Category Custom Form Attributes</span>
            </div>
            <span className="text-xs bg-red-50 text-[#b01622] px-2.5 py-0.5 rounded-full font-semibold">
              {activeSchema.length} Configured Fields
            </span>
          </div>

          {activeSchema.length === 0 ? (
            <div className="text-xs text-gray-400 italic text-center py-6 bg-gray-50 rounded-xl border border-gray-200/60">
              No custom fields configured for this category yet. You can add fields anytime via Category Form Builder!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {activeSchema.map((field) => (
                <div key={field.key} className={field.type === 'textarea' ? 'col-span-full' : ''}>
                  <label className="block text-xs font-bold text-gray-700 mb-2">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>

                  {/* SELECT DROPDOWN */}
                  {field.type === 'select' && (
                    <select
                      value={formData.attributes[field.key] || ''}
                      onChange={(e) => handleAttributeChange(field.key, e.target.value)}
                      required={field.required}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors"
                    >
                      <option value="">-- Select {field.label} --</option>
                      {field.options && field.options.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}

                  {/* TEXT INPUT */}
                  {field.type === 'text' && (
                    <input
                      type="text"
                      value={formData.attributes[field.key] || ''}
                      onChange={(e) => handleAttributeChange(field.key, e.target.value)}
                      placeholder={`Enter ${field.label}`}
                      required={field.required}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors"
                    />
                  )}

                  {/* NUMBER INPUT */}
                  {field.type === 'number' && (
                    <input
                      type="number"
                      step="any"
                      value={formData.attributes[field.key] || ''}
                      onChange={(e) => handleAttributeChange(field.key, e.target.value)}
                      placeholder="0.00"
                      required={field.required}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors"
                    />
                  )}

                  {/* TEXTAREA */}
                  {field.type === 'textarea' && (
                    <textarea
                      rows="3"
                      value={formData.attributes[field.key] || ''}
                      onChange={(e) => handleAttributeChange(field.key, e.target.value)}
                      placeholder={`Enter ${field.label}`}
                      required={field.required}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors resize-none"
                    ></textarea>
                  )}

                  {/* CHECKBOX */}
                  {field.type === 'checkbox' && (
                    <div className="flex items-center pt-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!formData.attributes[field.key]}
                          onChange={(e) => handleAttributeChange(field.key, e.target.checked)}
                          className="w-4 h-4 rounded text-[#b01622] focus:ring-[#b01622]"
                        />
                        Enable {field.label}
                      </label>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CARD 4: Opening Stock & Inventory Details */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <i className="fa-solid fa-boxes-packing text-[#b01622]"></i>
              <span>Opening Stock & Initial Inventory Details</span>
            </div>
            {isDiamondCategory ? (
              <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-3 py-1 rounded-full flex items-center gap-1.5 border border-blue-200/60 self-start sm:self-auto">
                <i className="fa-regular fa-gem text-blue-600"></i> Diamond Inventory Mode (Carat, Pcs & Cents)
              </span>
            ) : (
              <span className="text-xs bg-amber-50 text-amber-800 font-semibold px-3 py-1 rounded-full flex items-center gap-1.5 border border-amber-200/60 self-start sm:self-auto">
                <i className="fa-solid fa-coins text-amber-600"></i> Metal / Gold Inventory Mode (Weight & Touch)
              </span>
            )}
          </div>

          {isDiamondCategory ? (
            /* DIAMOND CATEGORY OPENING STOCK FIELDS */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {/* 1. Opening Piece Count / Qty */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Opening Piece Count (Pcs)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    name="opening_stock_qty"
                    value={formData.opening_stock_qty}
                    onChange={handleInputChange}
                    placeholder="e.g. 10"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Total diamond pieces</p>
                </div>

                {/* 2. Total Carat Weight (ct) */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Total Carat Weight (ct)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    name="opening_stock_weight"
                    value={formData.opening_stock_weight}
                    onChange={handleInputChange}
                    placeholder="e.g. 2.500"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-blue-700 placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors"
                  />
                  <p className="text-[10px] text-blue-600 font-mono mt-1">
                    ~{(parseFloat(formData.opening_stock_weight || 0) * 0.2).toFixed(3)} g (1ct = 0.2g)
                  </p>
                </div>

                {/* 3. Pointers / Cents per Stone (Calculated Box) */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Average Cent / Pointer
                  </label>
                  <div className="w-full px-3 py-2.5 bg-blue-50/60 border border-blue-200 rounded-xl flex flex-col justify-center h-[46px]">
                    {parseFloat(formData.opening_stock_qty || 0) > 0 && parseFloat(formData.opening_stock_weight || 0) > 0 ? (
                      <>
                        <span className="text-xs font-bold text-blue-900">
                          {(parseFloat(formData.opening_stock_weight) / parseFloat(formData.opening_stock_qty)).toFixed(3)} ct/pc
                        </span>
                        <span className="text-[10px] text-blue-700 font-semibold">
                          ({((parseFloat(formData.opening_stock_weight) / parseFloat(formData.opening_stock_qty)) * 100).toFixed(1)} Cts / Pointers)
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400 italic">0.00 ct/pc (0 Cts)</span>
                    )}
                  </div>
                </div>

                {/* 4. Rate per Carat (₹/ct) */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Opening Rate (₹/ct)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    name="opening_stock_rate"
                    value={formData.opening_stock_rate}
                    onChange={handleInputChange}
                    placeholder="Rate per carat"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-emerald-700 placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Valuation per carat</p>
                </div>

                {/* 5. Total Inventory Value (Calculated Box) */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Total Stock Valuation (₹)
                  </label>
                  <div className="w-full px-3 py-2.5 bg-emerald-50/60 border border-emerald-200 rounded-xl flex flex-col justify-center h-[46px]">
                    <span className="text-xs font-bold text-emerald-900">
                      ₹ {((parseFloat(formData.opening_stock_weight || 0) > 0 
                          ? parseFloat(formData.opening_stock_weight || 0) * parseFloat(formData.opening_stock_rate || 0)
                          : parseFloat(formData.opening_stock_qty || 0) * parseFloat(formData.opening_stock_rate || 0))
                        ).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-mono">Total Estimated Value</span>
                  </div>
                </div>

                {/* 6. Opening Stock Date */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Opening Stock Date
                  </label>
                  <input
                    type="date"
                    name="opening_stock_date"
                    value={formData.opening_stock_date}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* GOLD / METAL CATEGORY OPENING STOCK FIELDS */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Opening Stock Qty (Pcs)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  name="opening_stock_qty"
                  value={formData.opening_stock_qty}
                  onChange={handleInputChange}
                  placeholder="0"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Opening Stock Weight (g)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  name="opening_stock_weight"
                  value={formData.opening_stock_weight}
                  onChange={handleInputChange}
                  placeholder="0.000"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-amber-700 placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-gray-700">
                    Touch (%)
                  </label>
                  {isCustomTouch && (
                    <button
                      type="button"
                      onClick={() => setIsCustomTouch(false)}
                      className="text-[11px] font-bold text-[#b01622] hover:underline cursor-pointer"
                    >
                      Back to Select
                    </button>
                  )}
                </div>

                {!isCustomTouch ? (
                  <select
                    name="opening_touch"
                    value={TOUCH_OPTIONS.some(opt => Number(opt.value) === Number(formData.opening_touch)) ? Number(formData.opening_touch) : 'custom'}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'custom') {
                        setIsCustomTouch(true);
                      } else {
                        setFormData(prev => ({ ...prev, opening_touch: parseFloat(val) || 0 }));
                      }
                    }}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-emerald-700 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors"
                  >
                    <option value="">-- Select Touch (%) --</option>
                    {TOUCH_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                    <option value="custom">✏ Other / Custom Touch...</option>
                  </select>
                ) : (
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      name="opening_touch"
                      value={formData.opening_touch}
                      onChange={handleInputChange}
                      placeholder="100.00"
                      autoFocus
                      className="w-full px-4 py-3 bg-emerald-50/60 border border-emerald-300 rounded-xl text-sm font-bold text-emerald-800 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-600">%</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Fine Gold Wt (g / KG)
                </label>
                <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-cyan-800 flex flex-col justify-center h-[46px]">
                  <span>{(parseFloat(formData.opening_stock_weight || 0) * (parseFloat(formData.opening_touch || 100) / 100)).toFixed(3)} g</span>
                  <span className="text-[10px] text-gray-500 font-mono">({((parseFloat(formData.opening_stock_weight || 0) * (parseFloat(formData.opening_touch || 100) / 100)) / 1000).toFixed(3)} KG)</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Opening Stock Rate (₹/unit)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="opening_stock_rate"
                  value={formData.opening_stock_rate}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Opening Stock Date
                </label>
                <input
                  type="date"
                  name="opening_stock_date"
                  value={formData.opening_stock_date}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors"
                />
              </div>
            </div>
          )}
        </div>

        {/* CARD 5: Description & Remarks */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 space-y-3">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100 text-sm font-bold text-gray-900">
            <i className="fa-regular fa-file-lines text-[#b01622]"></i>
            <span>Description & Remarks</span>
          </div>

          <div>
            <textarea
              name="description"
              rows="4"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Provide detailed product description, casting specifications, or artisan notes..."
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors resize-none"
            ></textarea>
          </div>
        </div>

        {/* Form Action Bar */}
        <div className="flex items-center justify-end gap-4 pt-4">
          <Link
            to="/inventory"
            className="px-6 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3 bg-[#b01622] hover:bg-[#90121b] text-white text-sm font-semibold rounded-xl shadow-md transition-colors flex items-center gap-2 cursor-pointer"
          >
            {saving ? (
              <i className="fa-solid fa-circle-notch fa-spin"></i>
            ) : (
              <>
                <i className="fa-solid fa-check"></i>
                {isEditMode ? 'Update Product' : 'Save Product'}
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
