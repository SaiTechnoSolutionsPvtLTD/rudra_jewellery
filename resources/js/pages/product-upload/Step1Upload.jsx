import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ProductUploadStepNav from './ProductUploadStepNav';
import ImageGalleryModal from '../../components/ImageGalleryModal';
import ConfirmModal from '../../components/ConfirmModal';
import QuickDropdownCrudModal from '../../components/QuickDropdownCrudModal';
import { STAMP_OPTIONS, STONE_SIZE_OPTIONS, STONE_COLOR_OPTIONS } from '../../constants/productOptions';

export default function Step1Upload() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [showStylesModal, setShowStylesModal] = useState(false);
  const [showGoldTypesModal, setShowGoldTypesModal] = useState(false);
  const [designs, setDesigns] = useState([]);
  const [totalDesigns, setTotalDesigns] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [loading, setLoading] = useState(true);

  // Metadata (gold types, styles, diamond ranges)
  const [goldTypes, setGoldTypes] = useState([]);
  const [styles, setStyles] = useState([]);
  const [diamondRanges, setDiamondRanges] = useState([]);

  // Add Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [formData, setFormData] = useState({
    product_type: 'Gold & Diamond',
    design_no: '',
    net_wt: '',
    gold_type: '',
    setting_style: '',
    stamp: '+0',
    stone_size: '',
    stone_color: '',
    dia_wt_range: '',
    dia_wt_ct: '',
    variants: [],
  });
  const [newVariant, setNewVariant] = useState({
    sku: '',
    title: '',
    size: '',
    color: '',
    net_wt: '',
    stock_qty: '1',
  });

  const [customGoldTypeVisible, setCustomGoldTypeVisible] = useState(false);
  const [customGoldTypeInput, setCustomGoldTypeInput] = useState('');
  const [customStyleVisible, setCustomStyleVisible] = useState(false);
  const [customStyleInput, setCustomStyleInput] = useState('');

  // Edit Modal State
  const [editDesign, setEditDesign] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editFiles, setEditFiles] = useState([]);
  const [editFilePreviews, setEditFilePreviews] = useState([]);
  const [editFormData, setEditFormData] = useState({
    product_type: 'Gold & Diamond',
    design_no: '',
    net_wt: '',
    gold_type: '',
    setting_style: '',
    stamp: '+0',
    stone_size: '',
    stone_color: '',
    dia_wt_ct: '',
    variants: [],
  });
  const [editNewVariant, setEditNewVariant] = useState({
    sku: '',
    title: '',
    size: '',
    color: '',
    net_wt: '',
    stock_qty: '1',
  });

  // Uniqueness Status State
  const [addDesignNoStatus, setAddDesignNoStatus] = useState({ checking: false, exists: false, message: '' });
  const [editDesignNoStatus, setEditDesignNoStatus] = useState({ checking: false, exists: false, message: '' });

  // Real-time Uniqueness Checker
  const checkUniqueness = async (code, ignoreId = null, mode = 'add') => {
    const cleanCode = (code || '').trim();
    if (!cleanCode) {
      if (mode === 'add') setAddDesignNoStatus({ checking: false, exists: false, message: '' });
      else setEditDesignNoStatus({ checking: false, exists: false, message: '' });
      return;
    }

    if (mode === 'add') setAddDesignNoStatus({ checking: true, exists: false, message: '' });
    else setEditDesignNoStatus({ checking: true, exists: false, message: '' });

    try {
      const res = await api.get('/product-designs/check-design-no', {
        params: { design_no: cleanCode, ignore_id: ignoreId }
      });
      const data = res?.data || {};
      if (mode === 'add') {
        setAddDesignNoStatus({ checking: false, exists: !!data.exists, message: data.message || '' });
      } else {
        setEditDesignNoStatus({ checking: false, exists: !!data.exists, message: data.message || '' });
      }
    } catch (err) {
      console.error('Failed to check design no uniqueness', err);
      if (mode === 'add') setAddDesignNoStatus({ checking: false, exists: false, message: '' });
      else setEditDesignNoStatus({ checking: false, exists: false, message: '' });
    }
  };

  // Auto-Generate Unique Code
  const handleAutoGenerateCode = async (mode = 'add') => {
    try {
      const res = await api.get('/product-designs/generate-design-no');
      const generatedCode = res?.data?.design_no;
      if (generatedCode) {
        if (mode === 'add') {
          setFormData(prev => ({ ...prev, design_no: generatedCode }));
          setAddDesignNoStatus({ checking: false, exists: false, message: 'Generated unique Design Number!' });
        } else {
          setEditFormData(prev => ({ ...prev, design_no: generatedCode }));
          setEditDesignNoStatus({ checking: false, exists: false, message: 'Generated unique Design Number!' });
        }
      }
    } catch (err) {
      console.error('Failed to generate design no', err);
      showToast('Failed to auto-generate code', 'error');
    }
  };

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Gallery / Lightbox State
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryDetails, setGalleryDetails] = useState({});
  const [galleryOpen, setGalleryOpen] = useState(false);

  // Fetch Metadata
  const fetchMeta = async () => {
    try {
      const res = await api.get('/product-designs/meta');
      if (res?.data?.gold_types && Array.isArray(res.data.gold_types)) setGoldTypes(res.data.gold_types);
      if (res?.data?.styles && Array.isArray(res.data.styles)) setStyles(res.data.styles);
      if (res?.data?.diamond_ranges && Array.isArray(res.data.diamond_ranges)) setDiamondRanges(res.data.diamond_ranges);
    } catch (err) {
      console.error('Failed to fetch metadata', err);
    }
  };

  // Helper for pagination windowing
  const getPageNumbers = (current, last) => {
    if (last <= 1) return [1];
    if (last <= 7) {
      return Array.from({ length: last }, (_, i) => i + 1);
    }
    if (current <= 4) {
      return [1, 2, 3, 4, 5, '...', last];
    }
    if (current >= last - 3) {
      return [1, '...', last - 4, last - 3, last - 2, last - 1, last];
    }
    return [1, '...', current - 1, current, current + 1, '...', last];
  };

  // Fetch Designs
  const fetchDesigns = async (page = 1, requestedPerPage = perPage) => {
    try {
      setLoading(true);
      const res = await api.get(`/product-designs?page=${page}&per_page=${requestedPerPage}`);
      const payload = res?.data;
      const dataArr = Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : []);
      setDesigns(dataArr);
      setTotalDesigns(payload?.total ?? dataArr.length ?? 0);
      setCurrentPage(payload?.current_page || 1);
      setLastPage(payload?.last_page || 1);
    } catch (err) {
      console.error('Failed to fetch designs', err);
      setDesigns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeta();
    fetchDesigns(1);
  }, []);

  // Handle File Selections
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);

    const previews = files.map((file) => URL.createObjectURL(file));
    setFilePreviews(previews);
  };

  const handleEditFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    setEditFiles(files);

    const previews = files.map((file) => URL.createObjectURL(file));
    setEditFilePreviews(previews);
  };

  const resetAddForm = () => {
    setFormData({
      product_type: 'Gold & Diamond',
      design_no: '',
      net_wt: '',
      gold_type: '',
      setting_style: '',
      dia_wt_range: '',
      dia_wt_ct: '',
    });
    setSelectedFiles([]);
    setFilePreviews([]);
    setCustomGoldTypeVisible(false);
    setCustomGoldTypeInput('');
    setCustomStyleVisible(false);
    setCustomStyleInput('');
    setAddDesignNoStatus({ checking: false, exists: false, message: '' });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();

    const finalGoldType = customGoldTypeVisible && customGoldTypeInput.trim()
      ? customGoldTypeInput.trim()
      : (formData.gold_type || (formData.product_type === 'Silver' ? 'Silver 925' : '18 Carat'));

    const finalStyle = customStyleVisible && customStyleInput.trim()
      ? customStyleInput.trim()
      : formData.setting_style;

    if (selectedFiles.length === 0) {
      showToast('Please select at least one design image', 'error', 'Image Required');
      return;
    }
    if (!formData.design_no.trim()) {
      showToast('Please enter a Design No', 'error', 'Design No Required');
      return;
    }
    if (addDesignNoStatus.exists) {
      showToast('This Design Number already exists! Please use a unique Design Number.', 'error', 'Duplicate Design No');
      return;
    }
    if (!formData.net_wt) {
      showToast('Please enter NET WT (G)', 'error', 'Net Weight Required');
      return;
    }
    if (!finalGoldType) {
      showToast('Please select or specify a Gold Type', 'error', 'Gold Type Required');
      return;
    }
    if (!finalStyle) {
      showToast('Please select or specify a Setting Style', 'error', 'Setting Style Required');
      return;
    }

    try {
      setIsUploading(true);
      const data = new FormData();
      data.append('design_no', formData.design_no.trim());
      data.append('net_wt', formData.net_wt);
      data.append('gold_type', finalGoldType);
      data.append('setting_style', finalStyle);
      if (formData.dia_wt_range) data.append('dia_wt_range', formData.dia_wt_range);
      if (formData.dia_wt_ct) data.append('dia_wt_ct', formData.dia_wt_ct);

      selectedFiles.forEach((file) => {
        data.append('image[]', file);
      });

      await api.post('/product-designs', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      showToast('Design uploaded successfully!', 'success', 'Success');
      setIsAddOpen(false);
      resetAddForm();
      fetchMeta();
      fetchDesigns(1);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to upload design. Please check your inputs.';
      showToast(msg, 'error', 'Upload Failed');
    } finally {
      setIsUploading(false);
    }
  };

  const openEditModal = (design) => {
    setEditDesign(design);
    let inferredType = 'Gold & Diamond';
    const gt = (design.gold_type || '').toLowerCase();
    if (gt.includes('silver')) {
      inferredType = 'Silver';
    } else if (design.dia_wt_ct && (!design.gold_type || gt === '18 carat' || gt === '14 carat')) {
      inferredType = 'Diamond';
    } else if (design.gold_type && !design.dia_wt_ct) {
      inferredType = 'Gold';
    }

    setEditFormData({
      product_type: inferredType,
      design_no: design.design_no || '',
      net_wt: design.net_wt || '',
      gold_type: design.gold_type || '',
      setting_style: design.setting_style || '',
      dia_wt_ct: design.dia_wt_ct || '',
    });
    setEditFiles([]);
    setEditFilePreviews([]);
    setEditDesignNoStatus({ checking: false, exists: false, message: '' });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editDesign) return;

    if (editDesignNoStatus.exists) {
      showToast('This Design Number already exists! Please use a unique Design Number.', 'error', 'Duplicate Design No');
      return;
    }

    try {
      setIsUpdating(true);
      const data = new FormData();
      data.append('design_no', editFormData.design_no.trim());
      if (editFormData.net_wt) data.append('net_wt', editFormData.net_wt);
      if (editFormData.gold_type) data.append('gold_type', editFormData.gold_type);
      if (editFormData.setting_style) data.append('setting_style', editFormData.setting_style);
      if (editFormData.dia_wt_ct) data.append('dia_wt_ct', editFormData.dia_wt_ct);

      if (editFiles.length > 0) {
        editFiles.forEach((file) => {
          data.append('image[]', file);
        });
      }

      await api.post(`/product-designs/${editDesign.id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      showToast('Design updated successfully!', 'success', 'Updated');
      setIsEditOpen(false);
      setEditDesign(null);
      fetchDesigns(currentPage);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to update design';
      showToast(msg, 'error', 'Update Failed');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await api.delete(`/product-designs/${deleteTarget.id}`);
      showToast(`Design ${deleteTarget.design_no} deleted successfully`, 'success', 'Deleted');
      setDeleteTarget(null);
      fetchDesigns(currentPage);
    } catch (err) {
      console.error(err);
      showToast('Failed to delete design', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const openGallery = (design) => {
    const urls = design.image_urls && design.image_urls.length > 0
      ? design.image_urls
      : (Array.isArray(design.image_path) ? design.image_path.map(p => `/storage/${p}`) : []);

    if (urls.length === 0) {
      showToast('No images available for this design', 'info');
      return;
    }

    setGalleryImages(urls);
    setGalleryDetails({
      design_no: design.design_no,
      net_wt: design.net_wt,
      dia_wt: design.dia_wt_ct,
    });
    setGalleryOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Top Step Nav */}
      <ProductUploadStepNav currentStep={1} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Design Upload</h1>
          <p className="text-sm text-gray-500 mt-1">Upload multiple designs with specifications and images</p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetAddForm();
            setIsAddOpen(true);
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#b01622] text-white text-sm font-semibold rounded-lg hover:bg-[#90121b] transition-all shadow-sm shrink-0 cursor-pointer"
        >
          <i className="fa-solid fa-plus text-xs"></i>
          Add New Design
        </button>
      </div>

      {/* Uploaded Designs Table */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">
            Uploaded Designs{' '}
            <span className="text-gray-400 font-normal text-sm ml-1">({totalDesigns})</span>
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#fcfcfc] border-b border-gray-200/60 text-[11px] font-bold uppercase tracking-wider text-gray-500 text-center">
                <th className="px-6 py-4">S.No</th>
                <th className="px-6 py-4">PREVIEW</th>
                <th className="px-6 py-4">DESIGN NO</th>
                <th className="px-6 py-4">DIA WT (CT)</th>
                <th className="px-6 py-4">NET WT (G)</th>
                <th className="px-6 py-4">STATUS</th>
                <th className="px-6 py-4">ACTION</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-100 text-center">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-7 h-7 border-2 border-[#b01622] border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs">Loading uploaded designs...</span>
                    </div>
                  </td>
                </tr>
              ) : designs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-400 text-sm">
                    No designs uploaded yet. Click "+ Add New Design" to upload your first jewellery design!
                  </td>
                </tr>
              ) : (
                designs.map((design, index) => {
                  const images = design.image_urls || [];
                  const firstImage = images.length > 0 ? images[0] : null;

                  return (
                    <tr key={design.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4 text-gray-500 text-xs font-medium">
                        {(currentPage - 1) * perPage + index + 1}
                      </td>
                      <td className="px-6 py-4 flex justify-center">
                        {firstImage ? (
                          <div
                            onClick={() => openGallery(design)}
                            className="relative w-16 h-16 border border-gray-200 rounded-lg p-1 bg-gray-50 flex items-center justify-center cursor-pointer hover:border-[#b01622] transition-colors"
                            title="Click to view full preview"
                          >
                            {firstImage ? (
                              <img
                                src={firstImage}
                                alt={design.design_no}
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.style.display = 'none';
                                  if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                                }}
                                className="max-w-full max-h-full object-contain mix-blend-multiply"
                              />
                            ) : null}
                            <div className="flex flex-col items-center justify-center text-stone-300" style={{ display: firstImage ? 'none' : 'flex' }}>
                              <i className="fa-solid fa-gem text-lg text-red-200"></i>
                            </div>
                            {images.length > 1 && (
                              <div className="absolute -top-2 -right-2 bg-gray-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-white">
                                +{images.length - 1}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">No Image</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900 text-xs">{design.design_no}</td>
                      <td className="px-6 py-4 text-gray-700 text-xs">{design.dia_wt_ct || '-'}</td>
                      <td className="px-6 py-4 text-gray-700 text-xs">
                        {design.net_wt ? Number(design.net_wt).toFixed(3) : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center justify-center text-emerald-600 bg-emerald-50 text-xs font-bold px-3 py-1 rounded-full border border-emerald-100/50">
                          {design.status || 'Uploaded'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={() => openGallery(design)}
                            className="w-8 h-8 rounded-lg text-gray-500 hover:text-[#b01622] hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
                            title="View Design"
                          >
                            <i className="fa-solid fa-eye text-sm"></i>
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(design)}
                            className="w-8 h-8 rounded-lg text-gray-500 hover:text-amber-600 hover:bg-amber-50 flex items-center justify-center transition-colors cursor-pointer"
                            title="Edit Design"
                          >
                            <i className="fa-solid fa-pen-to-square text-sm"></i>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(design)}
                            className="w-8 h-8 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
                            title="Delete Design"
                          >
                            <i className="fa-solid fa-trash-can text-sm"></i>
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

        {/* Pagination */}
        <div className="p-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4 text-xs text-gray-500 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <span>
              Showing {totalDesigns === 0 ? 0 : (currentPage - 1) * perPage + 1} to{' '}
              {Math.min(currentPage * perPage, totalDesigns)} of {totalDesigns} designs
            </span>
            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-gray-400 font-normal">Per page:</span>
              <select
                value={perPage}
                onChange={(e) => {
                  const newPerPage = Number(e.target.value);
                  setPerPage(newPerPage);
                  fetchDesigns(1, newPerPage);
                }}
                className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 outline-none focus:border-[#b01622] cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => fetchDesigns(currentPage - 1)}
              className="px-3.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors cursor-pointer bg-white shadow-xs"
            >
              Previous
            </button>
            {getPageNumbers(currentPage, lastPage).map((p, idx) =>
              p === '...' ? (
                <span key={`ellipsis-${idx}`} className="px-2 py-1 text-gray-400">
                  ...
                </span>
              ) : (
                <button
                  type="button"
                  key={p}
                  onClick={() => fetchDesigns(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    p === currentPage
                      ? 'bg-[#b01622] text-white shadow-xs'
                      : 'border border-gray-200 text-gray-600 hover:bg-gray-100 bg-white'
                  }`}
                >
                  {p}
                </button>
              )
            )}
            <button
              type="button"
              disabled={currentPage >= lastPage}
              onClick={() => fetchDesigns(currentPage + 1)}
              className="px-3.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors cursor-pointer bg-white shadow-xs"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex items-center justify-between pt-4">
        <Link
          to="/dashboard"
          className="px-6 py-2.5 bg-white border border-gray-200 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors shadow-xs"
        >
          Cancel
        </Link>
        <button
          type="button"
          onClick={() => navigate('/product-upload/step2')}
          className="px-8 py-2.5 bg-[#b01622] text-white text-sm font-bold rounded-lg hover:bg-[#90121b] transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
        >
          Next &rarr;
        </button>
      </div>

      {/* ── Add Design Modal ── */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-xl my-8 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-[#b01622] flex items-center justify-center font-bold">
                  <i className="fa-solid fa-gem text-xs"></i>
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 leading-tight">Add New Design</h2>
                  <p className="text-xs text-gray-400">Fill in design specifications and upload images</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="text-gray-400 hover:text-gray-600 w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
              >
                <i className="fa-solid fa-xmark text-base"></i>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              {/* Product Material Category Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Product Category / Material <span className="text-[#b01622]">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'Gold & Diamond', label: 'Gold & Diamond', icon: 'fa-gem' },
                    { id: 'Gold', label: 'Gold Only', icon: 'fa-coins' },
                    { id: 'Diamond', label: 'Diamond Only', icon: 'fa-ring' },
                    { id: 'Silver', label: 'Silver', icon: 'fa-medal' },
                  ].map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => {
                        let defaultGold = formData.gold_type;
                        if (type.id === 'Silver') defaultGold = 'Silver 925 (92.5%)';
                        else if (type.id === 'Gold' && (!defaultGold || defaultGold.toLowerCase().includes('silver'))) defaultGold = '22 Carat';
                        else if (type.id === 'Diamond' && (!defaultGold || defaultGold.toLowerCase().includes('silver'))) defaultGold = '18 Carat';
                        setFormData({ ...formData, product_type: type.id, gold_type: defaultGold });
                      }}
                      className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${formData.product_type === type.id
                          ? 'bg-[#b01622] text-white border-[#b01622] shadow-sm ring-2 ring-red-100'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                        }`}
                    >
                      <i className={`fa-solid ${type.icon} text-xs`}></i>
                      <span>{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Image Input */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Design Image <span className="text-[#b01622]">*</span>
                </label>
                <div className="relative w-full h-[46px] border border-gray-300 rounded-lg bg-gray-50 hover:bg-white transition-colors overflow-hidden flex items-center px-3.5 cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="flex items-center gap-2 text-sm text-gray-500 truncate pointer-events-none">
                    <i className="fa-regular fa-image text-gray-400"></i>
                    <span className="truncate">
                      {selectedFiles.length > 0
                        ? `${selectedFiles.length} file(s) selected`
                        : 'Choose files... (Multiple allowed)'}
                    </span>
                  </div>
                </div>

                {/* Previews */}
                {filePreviews.length > 0 && (
                  <div className="flex items-center gap-2 mt-2 overflow-x-auto py-1">
                    {filePreviews.map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        alt="Preview"
                        className="w-12 h-12 rounded-md object-cover border border-gray-200"
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Design No */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-gray-700">
                      Design No <span className="text-[#b01622]">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleAutoGenerateCode('add')}
                      className="text-[11px] font-medium text-[#b01622] hover:text-[#90121b] hover:underline flex items-center gap-1 cursor-pointer"
                      title="Auto-generate a guaranteed unique code"
                    >
                      <i className="fa-solid fa-wand-magic-sparkles text-[10px]"></i> Auto Generate
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="Ex: RDP001"
                      value={formData.design_no}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, design_no: val });
                        checkUniqueness(val, null, 'add');
                      }}
                      className={`w-full px-3.5 h-[42px] bg-gray-50 border rounded-lg text-sm text-gray-800 focus:outline-none transition-colors ${addDesignNoStatus.exists
                          ? 'border-red-500 bg-red-50/30 focus:border-red-600'
                          : addDesignNoStatus.message && !addDesignNoStatus.exists
                            ? 'border-emerald-500 focus:border-emerald-600'
                            : 'border-gray-300 focus:border-[#b01622] focus:bg-white'
                        }`}
                    />
                    {addDesignNoStatus.checking && (
                      <div className="absolute right-3 top-3">
                        <div className="w-4 h-4 border-2 border-[#b01622] border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                  {addDesignNoStatus.exists && (
                    <p className="text-[11px] text-red-600 mt-1 font-semibold flex items-center gap-1">
                      <i className="fa-solid fa-circle-exclamation"></i>
                      {addDesignNoStatus.message || 'This Design Number already exists!'}
                    </p>
                  )}
                  {!addDesignNoStatus.exists && addDesignNoStatus.message && (
                    <p className="text-[11px] text-emerald-600 mt-1 font-medium flex items-center gap-1">
                      <i className="fa-solid fa-circle-check"></i>
                      {addDesignNoStatus.message}
                    </p>
                  )}
                </div>

                {/* NET WT (G) */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    NET WT (G) <span className="text-[#b01622]">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    placeholder="Ex: 5.850"
                    value={formData.net_wt}
                    onChange={(e) => setFormData({ ...formData, net_wt: e.target.value })}
                    className="w-full px-3.5 h-[42px] bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#b01622] focus:bg-white transition-colors"
                  />
                </div>

                {/* Metal Type / Purity */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-gray-700">
                      {formData.product_type === 'Silver'
                        ? 'Silver Purity'
                        : formData.product_type === 'Diamond'
                          ? 'Metal Purity / Type'
                          : 'Gold Type'}{' '}
                      <span className="text-[#b01622]">*</span>
                    </label>
                    {formData.product_type !== 'Silver' && (
                      <button
                        type="button"
                        onClick={() => setShowGoldTypesModal(true)}
                        className="text-[11px] font-bold text-[#b01622] hover:underline flex items-center gap-1 cursor-pointer"
                        title="Manage Gold Types Master list"
                      >
                        <i className="fa-solid fa-plus text-[9px]"></i>
                        <span>Manage Gold Types</span>
                      </button>
                    )}
                  </div>
                  {formData.product_type === 'Silver' ? (
                    <select
                      value={formData.gold_type || 'Silver 925 (92.5%)'}
                      onChange={(e) => setFormData({ ...formData, gold_type: e.target.value })}
                      className="w-full px-3.5 h-[42px] bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#b01622] focus:bg-white transition-colors"
                    >
                      <option value="Silver 925 (92.5%)">Silver 925 (92.5% Sterling)</option>
                      <option value="Silver 999 (Pure)">Silver 999 (Pure Silver)</option>
                      <option value="Silver 900">Silver 900</option>
                      <option value="Silver 800">Silver 800</option>
                    </select>
                  ) : (
                    <select
                      value={formData.gold_type}
                      onChange={(e) => setFormData({ ...formData, gold_type: e.target.value })}
                      className="w-full px-3.5 h-[42px] bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#b01622] focus:bg-white transition-colors"
                    >
                      <option value="">
                        {formData.product_type === 'Diamond' ? 'Select Metal Type (Default: 18 Carat)' : 'Select Gold Type'}
                      </option>
                      {goldTypes.map((gt, idx) => {
                        const val = typeof gt === 'object' && gt !== null ? (gt.name || gt.id) : String(gt);
                        const key = typeof gt === 'object' && gt !== null ? (gt.id || idx) : gt;
                        return (
                          <option key={key} value={val}>
                            {val}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>

                {/* Setting Style */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-gray-700">
                      Setting Style <span className="text-[#b01622]">*</span>
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
                    className="w-full px-3.5 h-[42px] bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#b01622] focus:bg-white transition-colors"
                  >
                    <option value="">Select Setting Style</option>
                    {styles.map((s, idx) => {
                      const name = typeof s === 'object' && s !== null ? (s.name || s.id) : String(s);
                      const key = typeof s === 'object' && s !== null ? (s.id || s.name || idx) : s;
                      return (
                        <option key={key} value={name}>
                          {name}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Diamond Wt Range */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Diamond Wt{' '}
                    <span className="text-gray-400 font-normal">
                      {formData.product_type === 'Diamond' || formData.product_type === 'Gold & Diamond' ? '(Range)' : '(Optional)'}
                    </span>
                  </label>
                  <select
                    value={formData.dia_wt_range}
                    onChange={(e) => setFormData({ ...formData, dia_wt_range: e.target.value })}
                    className="w-full px-3.5 h-[42px] bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#b01622] focus:bg-white transition-colors"
                  >
                    <option value="">None / Optional</option>
                    {diamondRanges.map((dr, idx) => {
                      const code = typeof dr === 'object' && dr !== null ? (dr.code || dr.id || dr.name) : String(dr);
                      const label = typeof dr === 'object' && dr !== null ? (dr.name || dr.label || dr.code) : String(dr);
                      const key = typeof dr === 'object' && dr !== null ? (dr.id || dr.code || idx) : dr;
                      return (
                        <option key={key} value={code}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* DIA WT (CT) */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    DIA WT (CT){' '}
                    {formData.product_type === 'Diamond' && (
                      <span className="text-[#b01622] text-[11px] font-normal">(Carats)</span>
                    )}
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 0.40"
                    value={formData.dia_wt_ct}
                    onChange={(e) => setFormData({ ...formData, dia_wt_ct: e.target.value })}
                    className="w-full px-3.5 h-[42px] bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#b01622] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || addDesignNoStatus.exists}
                  className="px-8 py-2.5 bg-[#b01622] text-white text-sm font-bold rounded-lg hover:bg-[#90121b] transition-colors shadow-md inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-plus text-xs"></i>
                      Upload Product
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Design Modal ── */}
      {isEditOpen && editDesign && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-xl my-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">
                Edit Design: {editDesign.design_no}
              </h2>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="text-gray-400 hover:text-gray-600 w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"
              >
                <i className="fa-solid fa-xmark text-base"></i>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {/* Product Material Category Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Product Category / Material <span className="text-[#b01622]">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'Gold & Diamond', label: 'Gold & Diamond', icon: 'fa-gem' },
                    { id: 'Gold', label: 'Gold Only', icon: 'fa-coins' },
                    { id: 'Diamond', label: 'Diamond Only', icon: 'fa-ring' },
                    { id: 'Silver', label: 'Silver', icon: 'fa-medal' },
                  ].map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => {
                        let defaultGold = editFormData.gold_type;
                        if (type.id === 'Silver') defaultGold = 'Silver 925 (92.5%)';
                        else if (type.id === 'Gold' && (!defaultGold || defaultGold.toLowerCase().includes('silver'))) defaultGold = '22 Carat';
                        else if (type.id === 'Diamond' && (!defaultGold || defaultGold.toLowerCase().includes('silver'))) defaultGold = '18 Carat';
                        setEditFormData({ ...editFormData, product_type: type.id, gold_type: defaultGold });
                      }}
                      className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${editFormData.product_type === type.id
                          ? 'bg-[#b01622] text-white border-[#b01622] shadow-sm ring-2 ring-red-100'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                        }`}
                    >
                      <i className={`fa-solid ${type.icon} text-xs`}></i>
                      <span>{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Update Images (Optional - Leave blank to keep existing)
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleEditFileChange}
                  className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-[#b01622] hover:file:bg-red-100 cursor-pointer"
                />
                {editFilePreviews.length > 0 && (
                  <div className="flex items-center gap-2 mt-2 overflow-x-auto py-1">
                    {editFilePreviews.map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        alt="Preview"
                        className="w-12 h-12 rounded-md object-cover border border-gray-200"
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-gray-700">
                      Design No <span className="text-[#b01622]">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleAutoGenerateCode('edit')}
                      className="text-[11px] font-medium text-[#b01622] hover:text-[#90121b] hover:underline flex items-center gap-1 cursor-pointer"
                      title="Auto-generate a guaranteed unique code"
                    >
                      <i className="fa-solid fa-wand-magic-sparkles text-[10px]"></i> Auto Generate
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={editFormData.design_no}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditFormData({ ...editFormData, design_no: val });
                        checkUniqueness(val, editDesign?.id, 'edit');
                      }}
                      className={`w-full px-3.5 h-[42px] bg-gray-50 border rounded-lg text-sm text-gray-800 focus:outline-none transition-colors ${editDesignNoStatus.exists
                          ? 'border-red-500 bg-red-50/30 focus:border-red-600'
                          : editDesignNoStatus.message && !editDesignNoStatus.exists
                            ? 'border-emerald-500 focus:border-emerald-600'
                            : 'border-gray-300 focus:border-[#b01622] focus:bg-white'
                        }`}
                    />
                    {editDesignNoStatus.checking && (
                      <div className="absolute right-3 top-3">
                        <div className="w-4 h-4 border-2 border-[#b01622] border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                  {editDesignNoStatus.exists && (
                    <p className="text-[11px] text-red-600 mt-1 font-semibold flex items-center gap-1">
                      <i className="fa-solid fa-circle-exclamation"></i>
                      {editDesignNoStatus.message || 'This Design Number already exists!'}
                    </p>
                  )}
                  {!editDesignNoStatus.exists && editDesignNoStatus.message && (
                    <p className="text-[11px] text-emerald-600 mt-1 font-medium flex items-center gap-1">
                      <i className="fa-solid fa-circle-check"></i>
                      {editDesignNoStatus.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">NET WT (G)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={editFormData.net_wt}
                    onChange={(e) => setEditFormData({ ...editFormData, net_wt: e.target.value })}
                    className="w-full px-3.5 h-[42px] bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#b01622] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    {editFormData.product_type === 'Silver'
                      ? 'Silver Purity'
                      : editFormData.product_type === 'Diamond'
                        ? 'Metal Purity / Type'
                        : 'Gold Type'}
                  </label>
                  {editFormData.product_type === 'Silver' ? (
                    <select
                      value={editFormData.gold_type || 'Silver 925 (92.5%)'}
                      onChange={(e) => setEditFormData({ ...editFormData, gold_type: e.target.value })}
                      className="w-full px-3.5 h-[42px] bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#b01622] focus:bg-white"
                    >
                      <option value="Silver 925 (92.5%)">Silver 925 (92.5% Sterling)</option>
                      <option value="Silver 999 (Pure)">Silver 999 (Pure Silver)</option>
                      <option value="Silver 900">Silver 900</option>
                      <option value="Silver 800">Silver 800</option>
                    </select>
                  ) : (
                    <select
                      value={editFormData.gold_type}
                      onChange={(e) => setEditFormData({ ...editFormData, gold_type: e.target.value })}
                      className="w-full px-3.5 h-[42px] bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#b01622] focus:bg-white"
                    >
                      <option value="">Select Metal Type</option>
                      {goldTypes.map((gt, idx) => {
                        const val = typeof gt === 'object' && gt !== null ? (gt.name || gt.id) : String(gt);
                        const key = typeof gt === 'object' && gt !== null ? (gt.id || idx) : gt;
                        return (
                          <option key={key} value={val}>
                            {val}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Setting Style</label>
                  <select
                    value={editFormData.setting_style}
                    onChange={(e) => setEditFormData({ ...editFormData, setting_style: e.target.value })}
                    className="w-full px-3.5 h-[42px] bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#b01622] focus:bg-white"
                  >
                    <option value="">Select Setting Style</option>
                    {styles.map((s, idx) => {
                      const name = typeof s === 'object' && s !== null ? (s.name || s.id) : String(s);
                      const key = typeof s === 'object' && s !== null ? (s.id || s.name || idx) : s;
                      return (
                        <option key={key} value={name}>
                          {name}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">DIA WT (CT)</label>
                  <input
                    type="text"
                    value={editFormData.dia_wt_ct}
                    onChange={(e) => setEditFormData({ ...editFormData, dia_wt_ct: e.target.value })}
                    className="w-full px-3.5 h-[42px] bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#b01622] focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating || editDesignNoStatus.exists}
                  className="px-8 py-2.5 bg-[#b01622] text-white text-sm font-bold rounded-lg hover:bg-[#90121b] transition-colors shadow-md inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating ? 'Saving...' : 'Update Design'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox / Gallery Modal */}
      <ImageGalleryModal
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        images={galleryImages}
        title={galleryDetails.design_no ? `Design: ${galleryDetails.design_no}` : 'Preview'}
        details={galleryDetails}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Design"
        message={`Are you sure you want to permanently delete design "${deleteTarget?.design_no}"? All associated images will also be removed.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Quick Dropdown CRUD Modal for Setting Styles */}
      <QuickDropdownCrudModal
        isOpen={showStylesModal}
        onClose={() => setShowStylesModal(false)}
        type="setting_style"
        onItemSelect={(newStyleName) => {
          setFormData((prev) => ({ ...prev, setting_style: newStyleName }));
          fetchMeta();
          fetchDesigns(currentPage);
        }}
        onRefresh={() => {
          fetchMeta();
          fetchDesigns(currentPage);
        }}
      />

      {/* Quick Dropdown CRUD Modal for Gold Types */}
      <QuickDropdownCrudModal
        isOpen={showGoldTypesModal}
        onClose={() => setShowGoldTypesModal(false)}
        type="gold_type"
        onItemSelect={(newGoldType) => {
          setFormData((prev) => ({ ...prev, gold_type: newGoldType }));
          setEditFormData((prev) => ({ ...prev, gold_type: newGoldType }));
          fetchMeta();
          fetchDesigns(currentPage);
        }}
        onRefresh={() => {
          fetchMeta();
          fetchDesigns(currentPage);
        }}
      />
    </div>
  );
}
