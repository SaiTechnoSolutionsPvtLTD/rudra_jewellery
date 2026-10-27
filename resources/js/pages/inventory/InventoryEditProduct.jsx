import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { compressImageFile } from '../../utils/imageCompressor';
import QuickDropdownCrudModal from '../../components/QuickDropdownCrudModal';
import { isMetalPurityStamp, isDiamondComponent } from '../../components/JewelleryTagCard';

export default function InventoryEditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const fileInputRef = useRef(null);

  // Master lists
  const [categoriesList, setCategoriesList] = useState([]);
  const [subcategoriesList, setSubcategoriesList] = useState([]);
  const [itemsMasterList, setItemsMasterList] = useState([]);
  const [karatsList, setKaratsList] = useState([]);
  const [stampsList, setStampsList] = useState([]);
  const [unitsList, setUnitsList] = useState([]);
  const [suppliersList, setSuppliersList] = useState([]);

  // Master management modals
  const [crudModalType, setCrudModalType] = useState(null); // 'karat' | 'stamp' | 'unit'
  const [showCrudModal, setShowCrudModal] = useState(false);

  const handleOpenMasterModal = (type) => {
    setCrudModalType(type);
    setShowCrudModal(true);
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingStockOnly, setSavingStockOnly] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Filter stamps dynamically by category
  const getFilteredStamps = (categoryName) => {
    if (!stampsList || stampsList.length === 0) return [];
    const cat = String(categoryName || 'Gold').toLowerCase().trim();
    const filtered = stampsList.filter((st) => {
      if (!st.applicable_for) return true;
      const app = String(st.applicable_for).toLowerCase();
      if (app.includes('all')) return true;
      if (cat.includes('gold')) return app.includes('gold');
      if (cat.includes('diamond')) return app.includes('diamond');
      if (cat.includes('stone') || cat.includes('gem') || cat.includes('pearl') || cat.includes('cz')) {
        return app.includes('stone') || app.includes('gem');
      }
      if (cat.includes('silver')) return app.includes('silver');
      return app.includes(cat);
    });
    return filtered;
  };

  // Image Gallery State for Main Product
  const [imageUrls, setImageUrls] = useState([]);

  // Main Form Data pre-filled from DB
  const [formData, setFormData] = useState({
    item_name: '',
    product_code: '',
    design_no: '',
    category_id: '',
    subcategory_id: '',
    karat: '22K',
    purity: '91.6',
    stamp: '916',
    unit: 'g',
    size: '0.00',
    no_of_pieces: '1',
    gross_wt: '',
    net_wt: '',
    pure_weight: '',
    vendor: '',
    vendor_name: '',
    vendor_id: '',
    quality: '',
    description: '',
  });

  // Paired / Sub-Components list
  const [components, setComponents] = useState([]);
  const [rawAttributes, setRawAttributes] = useState({});

  // Helper check for Diamond or Stone categories
  const isDiamondOrStoneCat = (catName = '') => {
    const name = (catName || '').toLowerCase();
    return name.includes('diamond') || name.includes('stone') || name.includes('gem');
  };

  const selectedCat = categoriesList.find((c) => String(c.id) === String(formData.category_id));
  const isSilverCategory = (selectedCat?.name || rawAttributes?.category_name || '').toLowerCase().includes('silver');

  // Pure 24K Gold Weight = Net Gold Weight * (Purity / 100)
  const computePureWeight = (netWt, purityPct) => {
    const net = parseFloat(netWt) || 0;
    const pur = parseFloat(purityPct) || 0;
    if (net > 0 && pur > 0) {
      return ((net * pur) / 100).toFixed(3);
    }
    return '';
  };

  useEffect(() => {
    fetchInitialData();
  }, [id]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);

      const [prodRes, catRes, itemMasterRes, karatRes, stampRes, unitRes, supplierRes] = await Promise.all([
        api.get(`/inventory/products/${id}`),
        api.get('/inventory/categories').catch(() => api.get('/categories')),
        api.get('/items').catch(() => api.get('/item-masters')).catch(() => ({ data: [] })),
        api.get('/karats').catch(() => ({ data: [] })),
        api.get('/stamps').catch(() => ({ data: [] })),
        api.get('/units').catch(() => ({ data: [] })),
        api.get('/suppliers').catch(() => ({ data: { data: [] } })),
      ]);

      const cats = catRes.data?.categories || catRes.data || [];
      setCategoriesList(cats);
      setItemsMasterList(itemMasterRes.data || []);
      setKaratsList(karatRes.data || []);
      setStampsList(stampRes.data || []);
      setUnitsList(unitRes.data || []);
      const sups = supplierRes.data?.data || supplierRes.data || [];
      setSuppliersList(Array.isArray(sups) ? sups : []);

      const p = prodRes.data.product || {};
      const attrs = prodRes.data.attributes || (typeof p.attributes === 'string' ? JSON.parse(p.attributes || '{}') : (p.attributes || {}));
      setRawAttributes(attrs);

      // Populate image gallery
      const rawImgs = prodRes.data.images || attrs.images || [];
      const validImgs = (Array.isArray(rawImgs) ? rawImgs : []).filter(
        (img) =>
          img &&
          typeof img === 'string' &&
          img !== '/placeholder-jewelry.png' &&
          !img.includes('/storage/data:image') &&
          img.trim() !== '1' &&
          img.length > 5
      );

      if (validImgs.length === 0 && (p.image_url || p.image)) {
        validImgs.push(p.image_url || p.image);
      }
      setImageUrls(validImgs);

      // Populate subcategories for product's category
      if (p.category_id) {
        const selCat = cats.find((c) => String(c.id) === String(p.category_id));
        setSubcategoriesList(selCat?.subcategories || []);
      }

      const gross = attrs.gross_wt || p.opening_stock_weight || '';
      const net = attrs.net_wt || p.opening_fine_weight || gross;
      const pur = attrs.purity || attrs.gold_type || '91.6';
      const pureWt = attrs.pure_weight || computePureWeight(net || gross, pur);
      const itemName = (p.name || attrs.item_name || '').replace(/\s*\(\d+\s*Parts\)/gi, '');
      setFormData({
        item_name: itemName,
        product_code: p.product_code || attrs.item_code || '',
        design_no: p.design_no || attrs.design_no || '',
        category_id: p.category_id || '',
        subcategory_id: p.subcategory_id || '',
        karat: attrs.karat || '22K',
        purity: pur,
        stamp: attrs.stamp || '916',
        unit: attrs.unit || 'g',
        size: attrs.size || '0.00',
        no_of_pieces: String(p.current_stock_qty ?? attrs.no_of_pieces ?? 1),
        gross_wt: gross,
        net_wt: net,
        pure_weight: pureWt,
        vendor: attrs.vendor || attrs.vendor_name || '',
        vendor_name: attrs.vendor_name || attrs.vendor || '',
        vendor_id: attrs.vendor_id || '',
        quality: attrs.quality || attrs.setting_style || '',
        description: p.description || '',
      });

      // Populate Components if available in DB attributes
      if (Array.isArray(attrs.components) && attrs.components.length > 0) {
        setComponents(attrs.components);
      } else {
        setComponents([]);
      }
    } catch (err) {
      console.error('Failed to load product for editing:', err);
      showToast('Failed to load product details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (catId) => {
    setFormData((prev) => ({ ...prev, category_id: catId, subcategory_id: '' }));
    const selected = categoriesList.find((c) => String(c.id) === String(catId));
    setSubcategoriesList(selected?.subcategories || []);
  };

  const handleCategoryChange = (e) => {
    handleCategorySelect(e.target.value);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      if (name === 'gross_wt' || name === 'net_wt' || name === 'purity') {
        const calcNet = updated.net_wt || updated.gross_wt;
        updated.pure_weight = computePureWeight(calcNet, updated.purity);
      }

      return updated;
    });
  };

  const handleQuickStockSave = async () => {
    try {
      setSavingStockOnly(true);
      const newStock = Math.max(0, parseInt(formData.no_of_pieces) || 0);
      const updatedAttributes = {
        ...rawAttributes,
        no_of_pieces: String(newStock),
        components: components,
      };

      await api.put(`/inventory/products/${id}`, {
        name: formData.item_name,
        product_code: formData.product_code,
        category_id: formData.category_id,
        subcategory_id: formData.subcategory_id,
        current_stock_qty: newStock,
        stock_qty: newStock,
        attributes: updatedAttributes,
      });

      showToast(`Stock quantity updated to ${newStock} units in inventory successfully!`, 'success', 'Stock Updated');
      navigate('/inventory');
    } catch (err) {
      console.error('Failed to update stock:', err);
      showToast(err.response?.data?.message || 'Failed to update stock quantity', 'error');
    } finally {
      setSavingStockOnly(false);
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const validFiles = files.filter((f) => f.type.startsWith('image/'));
    if (!validFiles.length) {
      showToast('Please upload valid image files (PNG, JPG, WEBP)', 'warning');
      return;
    }

    Promise.all(validFiles.map((file) => compressImageFile(file, 800, 0.82)))
      .then((compressedList) => {
        const successful = compressedList.filter(Boolean);
        if (successful.length > 0) {
          setImageUrls((prev) => [...prev, ...successful]);
          setImageError(false);
          showToast(`Added ${successful.length} photo(s)`, 'success');
        }
      })
      .catch((err) => {
        console.error('Image upload error:', err);
        showToast('Failed to process image', 'error');
      });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSetPrimaryImage = (index) => {
    if (index === 0) return;
    setImageUrls((prev) => {
      const copy = [...prev];
      const [chosen] = copy.splice(index, 1);
      copy.unshift(chosen);
      return copy;
    });
    showToast('Image set as primary thumbnail', 'info');
  };

  const handleRemoveImage = (index) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddComponent = () => {
    const diaCat = categoriesList.find((c) => isDiamondOrStoneCat(c.name)) || categoriesList[0];
    const isDia = isDiamondOrStoneCat(diaCat?.name);

    const newComp = {
      id_temp: Date.now() + Math.random(),
      component_type: isDia ? 'Diamond/Stone Component' : 'Metal Component',
      category_id: diaCat?.id || formData.category_id,
      category_name: diaCat?.name || 'Diamond/Stone',
      subcategory_id: formData.subcategory_id,
      item_code: `${formData.product_code}-C${components.length + 1}`,
      item_name: diaCat?.name || `Component ${components.length + 1}`,
      karat: '18K',
      purity: '75.0',
      stamp: 'VVS1',
      unit: 'g',
      stone_weight: '',
      gross_wt: '',
      net_wt: '',
      pure_weight: '',
      size: '0.00',
      no_of_pieces: '1',
      images: [],
    };
    setComponents((prev) => [...prev, newComp]);
    showToast('New component entry added below', 'info');
  };

  const handleRemoveComponent = (compIdx) => {
    const comp = components[compIdx];
    if (!comp) return;
    setComponents((prev) => prev.filter((c) => c.id_temp !== comp.id_temp));
    showToast('Component removed', 'info');
  };

  const handleComponentChange = (compIdx, fieldName, value) => {
    setComponents((prev) => {
      const copy = [...prev];
      const comp = { ...copy[compIdx], [fieldName]: value };

      const isDia = isDiamondOrStoneCat(comp.category_name);

      if (!isDia) {
        if (fieldName === 'gross_wt' || fieldName === 'net_wt' || fieldName === 'purity') {
          const net = comp.net_wt || comp.gross_wt;
          comp.pure_weight = computePureWeight(net, comp.purity);
        }
      }

      copy[compIdx] = comp;
      return copy;
    });
  };

  // Full Form Save Handler
  const handleSubmitFinal = async (e) => {
    if (e) e.preventDefault();

    if (!formData.item_name.trim()) {
      showToast('Item Name is required', 'error');
      return;
    }

    if (!imageUrls || imageUrls.length === 0) {
      setImageError(true);
      showToast('Product image is required! Please upload at least one image.', 'error');
      return;
    }

    setSaving(true);
    try {
      const updatedStockQty = parseInt(formData.no_of_pieces) || 1;

      const diaComp = Array.isArray(components) ? components.find(isDiamondComponent) : null;
      const isCaratUnit = diaComp && (diaComp.unit === 'ct' || diaComp.unit === 'Carats' || diaComp.unit === 'carat');
      const diaWt = diaComp ? (parseFloat(diaComp.stone_weight || (isCaratUnit ? diaComp.gross_wt : 0)) || 0) : 0;
      const diaCount = diaComp ? (parseInt(diaComp.no_of_pieces, 10) || 1) : 0;
      const diaStamp = diaComp?.stamp && !isMetalPurityStamp(diaComp.stamp) ? diaComp.stamp : null;

      const updatedAttributes = {
        ...rawAttributes,
        item_name: formData.item_name,
        item_code: formData.product_code,
        design_no: formData.design_no,
        karat: formData.karat,
        purity: formData.purity,
        stamp: formData.stamp,
        gold_stamp: formData.stamp,
        diamond_stamp: diaStamp || rawAttributes?.diamond_stamp || null,
        dia_wt_ct: diaWt > 0 ? diaWt.toFixed(2) : (rawAttributes?.dia_wt_ct || null),
        diamond_weight: diaWt > 0 ? diaWt.toFixed(2) : (rawAttributes?.diamond_weight || null),
        diamond_count: diaCount > 0 ? diaCount : (rawAttributes?.diamond_count || null),
        dia_count: diaCount > 0 ? diaCount : (rawAttributes?.dia_count || null),
        unit: formData.unit,
        size: formData.size,
        no_of_pieces: formData.no_of_pieces,
        gross_wt: parseFloat(formData.gross_wt) || 0,
        net_wt: parseFloat(formData.net_wt) || parseFloat(formData.gross_wt) || 0,
        pure_weight: parseFloat(formData.pure_weight) || 0,
        vendor: formData.vendor,
        vendor_name: formData.vendor_name || formData.vendor,
        vendor_id: formData.vendor_id,
        quality: formData.quality,
        images: imageUrls,
        child_images: imageUrls.slice(1),
        thumb_image: imageUrls[0],
        components: components,
      };

      await api.put(`/inventory/products/${id}`, {
        name: formData.item_name,
        product_code: formData.product_code,
        design_no: formData.design_no,
        category_id: formData.category_id,
        subcategory_id: formData.subcategory_id,
        current_stock_qty: updatedStockQty,
        stock_qty: updatedStockQty,
        gross_wt: parseFloat(formData.gross_wt) || 0,
        net_wt: parseFloat(formData.net_wt) || parseFloat(formData.gross_wt) || 0,
        pure_weight: parseFloat(formData.pure_weight) || 0,
        vendor: formData.vendor,
        vendor_name: formData.vendor_name || formData.vendor,
        vendor_id: formData.vendor_id,
        quality: formData.quality,
        attributes: updatedAttributes,
        components: components,
        image: imageUrls[0],
        thumbnail: imageUrls[0],
      });

      showToast(`Product "${formData.item_name}" updated in inventory successfully!`, 'success', 'Inventory Updated');
      navigate('/inventory');
    } catch (err) {
      console.error('Failed to update product:', err);
      showToast(err.response?.data?.message || 'Failed to update product details', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-80 text-stone-400">
        <i className="fa-solid fa-circle-notch fa-spin text-2xl text-[#b01622] mr-3"></i>
        <span className="text-sm font-semibold">Loading product specifications...</span>
      </div>
    );
  }

  const activeCategoryObj = categoriesList.find((c) => String(c.id) === String(formData.category_id));

  return (
    <div className="w-full pb-20 space-y-6 font-['Inter',-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif] max-w-5xl mx-auto pt-2">

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 mb-0.5">
            <Link to="/inventory" className="hover:text-stone-900 transition-colors">Inventory</Link>
            <span>›</span>
            <span>Edit Product</span>
            <span>›</span>
            <span className="text-[#b01622] font-mono font-bold">{formData.product_code}</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Edit Inventory Product Specifications</h1>
        </div>

        <Link
          to="/inventory"
          className="px-3.5 py-1.5 bg-white border border-stone-300 hover:border-stone-400 text-stone-700 text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <i className="fa-solid fa-arrow-left text-[11px]"></i>
          <span>Cancel &amp; Exit</span>
        </Link>
      </div>

      {/* QUICK IN-STOCK QUANTITY ENTRY BOX */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-100/60 to-orange-50/70 rounded-2xl border border-amber-300 p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center text-lg shadow-2xs shrink-0">
              <i className="fa-solid fa-boxes-stacked"></i>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 tracking-tight">
                Quick In-Stock Quantity Entry
              </h3>
              <p className="text-[11px] text-stone-600 font-medium">
                Update physical inventory count instantly in the database without altering other product specs.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleQuickStockSave}
            disabled={savingStockOnly}
            className="px-4 py-2 bg-[#b01622] hover:bg-[#8f1019] text-white text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
          >
            {savingStockOnly ? (
              <i className="fa-solid fa-circle-notch fa-spin"></i>
            ) : (
              <i className="fa-solid fa-check text-xs"></i>
            )}
            <span>Save Stock &amp; Exit</span>
          </button>
        </div>

        <div className="bg-white rounded-xl p-3 border border-amber-200/90 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
          <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider">
            CURRENT IN-STOCK QUANTITY (PIECES)
          </span>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                const curr = Math.max(0, (parseInt(formData.no_of_pieces) || 0) - 1);
                setFormData((prev) => ({ ...prev, no_of_pieces: String(curr) }));
              }}
              className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-base flex items-center justify-center transition-colors cursor-pointer"
              title="Decrease stock count"
            >
              -
            </button>

            <input
              type="number"
              min="0"
              name="no_of_pieces"
              value={formData.no_of_pieces}
              onChange={handleInputChange}
              className="w-20 text-center py-1.5 px-2 bg-[#f7f0f0] border border-[#e6c5c5] rounded-lg text-sm font-mono font-bold text-[#b01622] focus:outline-none focus:bg-white focus:border-[#b01622]"
            />

            <button
              type="button"
              onClick={() => {
                const curr = (parseInt(formData.no_of_pieces) || 0) + 1;
                setFormData((prev) => ({ ...prev, no_of_pieces: String(curr) }));
              }}
              className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-base flex items-center justify-center transition-colors cursor-pointer"
              title="Increase stock count"
            >
              +
            </button>

            <span className="text-xs font-semibold text-stone-500 pl-1">
              Units in vault
            </span>
          </div>
        </div>
      </div>


      {/* CATEGORY & SUBCATEGORY SELECTION */}
      <div className="bg-white rounded-2xl border border-stone-200/90 p-6 shadow-2xs space-y-5">
        <div>
          <h2 className="text-base font-bold text-gray-900 tracking-tight">Category &amp; Subcategory Selection</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Select or update the product classification for <strong className="font-mono text-[#b01622]">{formData.product_code}</strong>
          </p>
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-bold text-stone-600 uppercase tracking-wider block">
            Category
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {categoriesList.map((cat) => {
              const isSelected = String(formData.category_id) === String(cat.id);
              return (
                <div
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${isSelected
                    ? 'border-[#b01622] bg-[#fdf5f5] ring-2 ring-red-100 shadow-2xs'
                    : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/60'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-base ${isSelected ? 'bg-[#b01622] text-white' : 'bg-red-50 text-[#b01622]'
                      }`}>
                      <i className="fa-solid fa-gem"></i>
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-gray-900 leading-snug">{cat.name}</h3>
                      <span className="text-[10px] font-mono text-stone-400 font-semibold">{cat.code || 'CAT'}</span>
                    </div>
                  </div>

                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-[#b01622] bg-[#b01622] text-white' : 'border-stone-300'
                    }`}>
                    {isSelected && <i className="fa-solid fa-check text-[9px]"></i>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {subcategoriesList.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-stone-100">
            <span className="text-[11px] font-bold text-stone-600 uppercase tracking-wider block">
              Subcategory for {activeCategoryObj?.name || 'Category'}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {subcategoriesList.map((sub) => {
                const isSelected = String(formData.subcategory_id) === String(sub.id);
                return (
                  <div
                    key={sub.id}
                    onClick={() => handleSubcategorySelect(sub.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${isSelected
                      ? 'border-[#b01622] bg-[#fdf5f5] ring-2 ring-red-100 shadow-2xs'
                      : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/60'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-base ${isSelected ? 'bg-[#b01622] text-white' : 'bg-red-50 text-[#b01622]'
                        }`}>
                        <i className="fa-solid fa-layer-group"></i>
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-gray-900 leading-snug">{sub.name}</h3>
                        <span className="text-[10px] font-mono text-stone-400 font-semibold">{sub.code || 'SUB'}</span>
                      </div>
                    </div>

                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-[#b01622] bg-[#b01622] text-white' : 'border-stone-300'
                      }`}>
                      {isSelected && <i className="fa-solid fa-check text-[9px]"></i>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* MAIN PRODUCT SPECIFICATIONS FORM */}
      <form onSubmit={handleSubmitFinal} className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs overflow-hidden space-y-0">

        <div className="bg-[#b01622] text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Main Product Specifications &amp; Media</h2>
            <p className="text-xs text-red-100 font-normal mt-0.5">
              Edit item specifications, purity, weight details, vendor, and media details.
            </p>
          </div>
          <div className="px-3 py-1 rounded-lg bg-white/10 text-white text-xs font-mono font-bold">
            {formData.product_code}
          </div>
        </div>

        <div className="p-6 bg-white space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left Column: Product Media Upload */}
            <div className="lg:col-span-5 space-y-3">
              <span className="text-[11px] font-bold text-stone-600 uppercase tracking-wider block">
                PRODUCT MEDIA
              </span>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl overflow-hidden text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[220px] group ${imageError
                  ? 'border-red-500 bg-red-50/70 ring-2 ring-red-200'
                  : 'border-[#e6c5c5] hover:border-[#b01622] bg-[#f7f0f0] hover:bg-[#f2e6e6]'
                  }`}
              >
                {imageUrls.length > 0 ? (
                  <div className="relative w-full h-[220px] bg-stone-900 flex items-center justify-center">
                    <img
                      src={imageUrls[0]}
                      alt="Primary Thumbnail"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute top-2 left-2 bg-[#b01622] text-white text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider shadow-2xs">
                      Primary Thumbnail
                    </div>
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-white p-4">
                      <span className="text-xs font-bold">+ Click to Add More Photos</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className="px-3.5 py-1 bg-white text-[#b01622] hover:bg-stone-100 rounded-full text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                      >
                        Browse Files
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl mb-2 text-[#b01622]">
                      <i className="fa-solid fa-camera"></i>
                    </div>
                    <h4 className="text-xs font-bold text-gray-900 tracking-tight">
                      Drag &amp; Drop Product Images
                    </h4>
                    <p className="text-[10px] text-stone-400 mt-0.5 mb-3">
                      Support JPG, PNG, or WEBP formats.
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="px-5 py-1.5 bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 rounded-full text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                    >
                      Browse Files
                    </button>
                  </div>
                )}
              </div>

              {imageError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-semibold flex items-center gap-2">
                  <i className="fa-solid fa-circle-exclamation text-xs text-red-600"></i>
                  <span>At least one product image is required.</span>
                </div>
              )}

              {imageUrls.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-700 block">
                      Uploaded Images ({imageUrls.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[11px] font-bold text-[#b01622] hover:underline cursor-pointer"
                    >
                      + Add Photo
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {imageUrls.map((img, idx) => (
                      <div
                        key={idx}
                        className={`relative group rounded-lg overflow-hidden border aspect-square bg-stone-900 shadow-2xs ${idx === 0 ? 'border-[#b01622] ring-1 ring-red-200' : 'border-stone-200'
                          }`}
                      >
                        <img src={img} alt={`Image ${idx + 1}`} className="w-full h-full object-cover" />
                        {idx === 0 && (
                          <span className="absolute top-0.5 left-0.5 bg-[#b01622] text-white text-[7px] font-black px-1 rounded uppercase tracking-wider">
                            Main
                          </span>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 p-1">
                          {idx !== 0 && (
                            <button
                              type="button"
                              onClick={() => handleSetPrimaryImage(idx)}
                              className="w-5 h-5 rounded bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center text-[8px] cursor-pointer"
                              title="Set as Primary Thumbnail"
                            >
                              <i className="fa-solid fa-star"></i>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="w-5 h-5 rounded bg-red-600 hover:bg-red-700 text-white flex items-center justify-center text-[8px] cursor-pointer"
                            title="Remove Image"
                          >
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        </div>
                      </div>
                    ))}

                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border border-dashed border-[#e6c5c5] hover:border-[#b01622] bg-[#f7f0f0] rounded-lg flex flex-col items-center justify-center aspect-square cursor-pointer transition-colors text-stone-500 hover:text-[#b01622]"
                      title="Add More Photos"
                    >
                      <i className="fa-solid fa-plus text-xs mb-0.5"></i>
                      <span className="text-[9px] font-bold">Add</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Form Inputs */}
            <div className="lg:col-span-7 space-y-3.5">

              {/* Row 1: CATEGORY & SUBCATEGORY */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                    CATEGORY <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleCategoryChange}
                    className="w-full p-2.5 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622] cursor-pointer"
                    required
                  >
                    <option value="">-- Select Category --</option>
                    {categoriesList.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                    SUBCATEGORY
                  </label>
                  <select
                    name="subcategory_id"
                    value={formData.subcategory_id}
                    onChange={(e) => setFormData({ ...formData, subcategory_id: e.target.value })}
                    className="w-full p-2.5 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622] cursor-pointer"
                  >
                    <option value="">-- Select Subcategory --</option>
                    {subcategoriesList.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: ITEM NAME, PRODUCT SKU, & DESIGN NO */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                    ITEM NAME <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="item_name"
                    value={formData.item_name}
                    onChange={handleInputChange}
                    className="w-full p-2.5 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622] cursor-pointer"
                  >
                    {itemsMasterList.length > 0 ? (
                      itemsMasterList.map((itm) => (
                        <option key={itm.id} value={itm.name}>
                          {itm.name} {itm.code ? `[${itm.code}]` : ''}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value={formData.item_name || 'Cocktail Ring'}>{formData.item_name || 'Cocktail Ring'}</option>
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
                    PRODUCT SKU <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="product_code"
                    value={formData.product_code}
                    onChange={handleInputChange}
                    placeholder="RJ-G-18294"
                    className="w-full p-2.5 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622]"
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
                    value={formData.design_no || ''}
                    onChange={handleInputChange}
                    placeholder="RJ-DES-001"
                    className="w-full p-2.5 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622]"
                  />
                </div>
              </div>

              {/* Row 3: KARAT, PURITY (%), STAMP, UNIT */}
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
                      const kVal = e.target.value;
                      let pVal = '91.6';
                      if (kVal.includes('24')) pVal = '99.9';
                      else if (kVal.includes('18')) pVal = '75.0';
                      else if (kVal.includes('14')) pVal = '58.5';
                      setFormData((prev) => {
                        const pure = computePureWeight(prev.net_wt || prev.gross_wt, pVal);
                        return {
                          ...prev,
                          karat: kVal,
                          purity: pVal,
                          pure_weight: pure,
                        };
                      });
                    }}
                    className="w-full p-2.5 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622] cursor-pointer"
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
                    className="w-full p-2.5 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622]"
                  />
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
                    className="w-full p-2.5 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622] cursor-pointer"
                  >
                    {stampsList.map((st) => (
                      <option key={st.id} value={st.name}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </div>

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
                    className="w-full p-2.5 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622] cursor-pointer"
                  >
                    {unitsList.map((u) => (
                      <option key={u.id} value={u.name}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 4: SIZE & NO. OF PIECES */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                    className="w-full p-2.5 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                    NO. OF PIECES / IN-STOCK QTY
                  </label>
                  <input
                    type="number"
                    min="0"
                    name="no_of_pieces"
                    value={formData.no_of_pieces}
                    onChange={handleInputChange}
                    placeholder="1"
                    className="w-full p-2.5 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622]"
                  />
                </div>
              </div>

              {/* Row 5: GROSS WEIGHT, NET GOLD WEIGHT, PURE WEIGHT OF 24K */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
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
                    className="w-full p-2.5 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622]"
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
                    className="w-full p-2.5 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#b01622] uppercase tracking-wider mb-1">
                    {isSilverCategory ? 'FINE SILVER WEIGHT' : 'PURE WEIGHT OF 24K'}
                  </label>
                  <input
                    type="text"
                    name="pure_weight"
                    value={formData.pure_weight ? `${formData.pure_weight} g` : ''}
                    placeholder="0.000g"
                    className="w-full p-2.5 bg-stone-100 border border-stone-300 rounded-xl text-xs font-mono font-black text-[#b01622] focus:outline-none cursor-not-allowed"
                    readOnly
                  />
                </div>
              </div>

              {/* Row 5.5: VENDOR & QUALITY */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                    className="w-full p-2.5 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622] cursor-pointer"
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
                    className="w-full p-2.5 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622]"
                  />
                </div>
              </div>



              {/* Row 7: DESCRIPTION */}
              <div>
                <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                  DESCRIPTION &amp; NOTES
                </label>
                <textarea
                  rows="3"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter crafting notes or specifications..."
                  className="w-full p-2.5 bg-[#f7f0f0] border border-[#e6c5c5] rounded-xl text-xs text-gray-900 focus:outline-none focus:bg-white focus:border-[#b01622]"
                />
              </div>

            </div>
          </div>
        </div>

        {/* PRODUCT COMPONENTS BREAKDOWN */}
        <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-gray-900 tracking-tight">Product Components &amp; Paired Items</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Manage individual components and sub-parts attached to this inventory product.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddComponent}
              className="px-4 py-2 bg-[#b01622] hover:bg-[#8f1019] text-white text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <i className="fa-solid fa-plus text-xs"></i>
              <span>+ Add New Item</span>
            </button>
          </div>

          {components.length > 0 ? (
            <div className="space-y-6 pt-2">
              {components.map((comp, compIdx) => {
                const isDia = isDiamondOrStoneCat(comp.category_name || comp.item_name);

                return (
                  <div key={comp.id_temp || compIdx} className="bg-[#faf7f7] rounded-xl border border-stone-300 p-5 space-y-4 relative">

                    {/* Component Header */}
                    <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#b01622] text-white text-xs font-bold flex items-center justify-center">
                          {compIdx + 1}
                        </span>
                        <h3 className="text-sm font-bold text-gray-900">
                          {comp.category_name || comp.item_name || `Component ${compIdx + 1}`}
                        </h3>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-stone-200 text-stone-700">
                          {comp.category_name || (isDia ? 'Diamond/Stone' : 'Gold')}
                        </span>
                        {comp.item_code && (
                          <span className="text-xs font-mono text-[#b01622] font-semibold bg-red-50 px-2 py-0.5 rounded">
                            {comp.item_code}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveComponent(compIdx)}
                        className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <i className="fa-solid fa-trash-can text-[10px]"></i>
                        <span>Remove Component</span>
                      </button>
                    </div>

                    {/* Component Form Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">
                          Category Name
                        </label>
                        <select
                          value={comp.category_id || ''}
                          onChange={(e) => {
                            const cat = categoriesList.find((c) => String(c.id) === String(e.target.value));
                            handleComponentChange(compIdx, 'category_id', e.target.value);
                            if (cat) {
                              handleComponentChange(compIdx, 'category_name', cat.name);
                              handleComponentChange(compIdx, 'item_name', cat.name);
                              const filteredStamps = getFilteredStamps(cat.name);
                              const firstStamp = filteredStamps.length > 0 ? filteredStamps[0].name : '';
                              handleComponentChange(compIdx, 'stamp', firstStamp);
                            }
                          }}
                          className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs font-semibold text-gray-900"
                        >
                          {categoriesList.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">
                          Stamp
                        </label>
                        <select
                          value={comp.stamp || ''}
                          onChange={(e) => handleComponentChange(compIdx, 'stamp', e.target.value)}
                          className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs font-semibold text-gray-900"
                        >
                          {getFilteredStamps(comp.category_name || comp.category).length > 0 ? (
                            getFilteredStamps(comp.category_name || comp.category).map((st) => (
                              <option key={st.id} value={st.name}>
                                {st.name}
                              </option>
                            ))
                          ) : (
                            <option value="">No stamps available</option>
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">
                          Unit
                        </label>
                        <select
                          value={comp.unit || (unitsList.length > 0 ? unitsList[0].name : 'Grams')}
                          onChange={(e) => handleComponentChange(compIdx, 'unit', e.target.value)}
                          className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs font-semibold text-gray-900"
                        >
                          {unitsList.length > 0 ? (
                            unitsList.map((u) => (
                              <option key={u.id} value={u.name}>{u.name}</option>
                            ))
                          ) : (
                            <>
                              <option value="Grams">Grams</option>
                              <option value="Carats">Carats</option>
                            </>
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">
                          No. of Pieces
                        </label>
                        <input
                          type="number"
                          value={comp.no_of_pieces || 1}
                          onChange={(e) => handleComponentChange(compIdx, 'no_of_pieces', e.target.value)}
                          className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs font-bold text-gray-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-[#b01622] uppercase mb-1">
                          Stone Weight (ct)
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          value={comp.stone_weight || comp.gross_wt || ''}
                          onChange={(e) => {
                            handleComponentChange(compIdx, 'stone_weight', e.target.value);
                            handleComponentChange(compIdx, 'gross_wt', e.target.value);
                          }}
                          className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold text-gray-900"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center bg-stone-50 rounded-xl border border-dashed border-stone-300 text-stone-500 text-xs font-semibold space-y-2">
              <p>No additional paired components attached to this main item.</p>
              <button
                type="button"
                onClick={handleAddComponent}
                className="px-4 py-1.5 bg-white border border-stone-300 hover:border-[#b01622] text-[#b01622] text-xs font-bold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <i className="fa-solid fa-plus text-xs"></i>
                <span>Add New Item</span>
              </button>
            </div>
          )}
        </div>

        {/* Action Bar Footer */}
        <div className="p-5 bg-stone-50 border-t border-stone-200/80 flex items-center justify-between">
          <Link
            to="/inventory"
            className="px-5 py-2.5 bg-white border border-stone-300 text-stone-700 hover:bg-stone-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Cancel &amp; Exit
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3 bg-[#b01622] hover:bg-[#8f1019] text-[#ffffff] rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving && <i className="fa-solid fa-circle-notch fa-spin"></i>}
            <span>Save &amp; Update Inventory Item</span>
          </button>
        </div>

      </form>

      {/* Quick CRUD Master Modal */}
      {showCrudModal && (
        <QuickDropdownCrudModal
          isOpen={showCrudModal}
          onClose={() => setShowCrudModal(false)}
          type={crudModalType}
          onItemSelect={(val) => {
            if (crudModalType === 'karat') setFormData((prev) => ({ ...prev, karat: val }));
            if (crudModalType === 'stamp') setFormData((prev) => ({ ...prev, stamp: val }));
            if (crudModalType === 'unit') setFormData((prev) => ({ ...prev, unit: val }));
          }}
          onRefresh={() => {
            api.get('/karats').then((r) => setKaratsList(r.data || []));
            api.get('/stamps').then((r) => setStampsList(r.data || []));
            api.get('/units').then((r) => setUnitsList(r.data || []));
          }}
        />
      )}

    </div>
  );
}
