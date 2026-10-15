import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ProductUploadStepNav from './ProductUploadStepNav';
import ImageGalleryModal from '../../components/ImageGalleryModal';
import ConfirmModal from '../../components/ConfirmModal';

export default function Step1Upload() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [designs, setDesigns] = useState([]);
  const [totalDesigns, setTotalDesigns] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [loading, setLoading] = useState(true);

  // Add Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [formData, setFormData] = useState({
    design_no: '',
    dia_wt_ct: '',
    net_wt: '',
  });

  // Edit Modal State
  const [editDesign, setEditDesign] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editFiles, setEditFiles] = useState([]);
  const [editFilePreviews, setEditFilePreviews] = useState([]);
  const [editFormData, setEditFormData] = useState({
    design_no: '',
    dia_wt_ct: '',
    net_wt: '',
  });

  // Uniqueness Status State
  const [addDesignNoStatus, setAddDesignNoStatus] = useState({ checking: false, exists: false, message: '' });
  const [editDesignNoStatus, setEditDesignNoStatus] = useState({ checking: false, exists: false, message: '' });

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Gallery / Lightbox State
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryDetails, setGalleryDetails] = useState({});
  const [galleryOpen, setGalleryOpen] = useState(false);

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
        params: { design_no: cleanCode, ignore_id: ignoreId },
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
          setFormData((prev) => ({ ...prev, design_no: generatedCode }));
          setAddDesignNoStatus({ checking: false, exists: false, message: 'Generated unique Design Number!' });
        } else {
          setEditFormData((prev) => ({ ...prev, design_no: generatedCode }));
          setEditDesignNoStatus({ checking: false, exists: false, message: 'Generated unique Design Number!' });
        }
      }
    } catch (err) {
      console.error('Failed to generate design no', err);
      showToast('Failed to auto-generate code', 'error');
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
      const res = await api.get('/product-designs', {
        params: {
          page,
          per_page: requestedPerPage,
        },
      });

      setDesigns(res.data.data || []);
      setTotalDesigns(res.data.total || 0);
      setCurrentPage(res.data.current_page || 1);
      setLastPage(res.data.last_page || 1);
    } catch (err) {
      console.error('Failed to fetch designs', err);
      showToast('Failed to load designs.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDesigns(currentPage, perPage);
  }, [currentPage, perPage]);

  // Handle Image Selection for Add
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files || files.length === 0) return;

    const newFiles = [...selectedFiles, ...files];
    setSelectedFiles(newFiles);

    const previews = newFiles.map((file) => URL.createObjectURL(file));
    setFilePreviews(previews);
  };

  const resetAddForm = () => {
    setFormData({
      design_no: '',
      dia_wt_ct: '',
      net_wt: '',
    });
    setSelectedFiles([]);
    setFilePreviews([]);
    setAddDesignNoStatus({ checking: false, exists: false, message: '' });
  };

  // Submit Add Design
  const handleAddSubmit = async (e) => {
    e.preventDefault();

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

    try {
      setIsUploading(true);
      const data = new FormData();
      data.append('design_no', formData.design_no.trim());
      data.append('net_wt', formData.net_wt);
      if (formData.dia_wt_ct) {
        data.append('dia_wt_ct', formData.dia_wt_ct);
      }

      selectedFiles.forEach((file) => {
        data.append('image[]', file);
      });

      await api.post('/product-designs', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      showToast('Design uploaded successfully!', 'success', 'Success');
      setIsAddOpen(false);
      resetAddForm();
      fetchDesigns(1);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to upload design. Please check your inputs.';
      showToast(msg, 'error', 'Upload Failed');
    } finally {
      setIsUploading(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (design) => {
    setEditDesign(design);
    setEditFormData({
      design_no: design.design_no || '',
      dia_wt_ct: design.dia_wt_ct || '',
      net_wt: design.net_wt || '',
    });
    setEditFiles([]);
    setEditFilePreviews([]);
    setEditDesignNoStatus({ checking: false, exists: false, message: '' });
    setIsEditOpen(true);
  };

  // Handle Image Selection for Edit
  const handleEditFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files || files.length === 0) return;

    const newFiles = [...editFiles, ...files];
    setEditFiles(newFiles);

    const previews = newFiles.map((file) => URL.createObjectURL(file));
    setEditFilePreviews(previews);
  };

  // Submit Edit Design
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editDesign) return;

    if (!editFormData.design_no.trim()) {
      showToast('Please enter a Design No', 'error', 'Design No Required');
      return;
    }
    if (editDesignNoStatus.exists) {
      showToast('This Design Number already exists! Please use a unique Design Number.', 'error', 'Duplicate Design No');
      return;
    }
    if (!editFormData.net_wt) {
      showToast('Please enter NET WT (G)', 'error', 'Net Weight Required');
      return;
    }

    try {
      setIsUpdating(true);
      const data = new FormData();
      data.append('design_no', editFormData.design_no.trim());
      data.append('net_wt', editFormData.net_wt);
      if (editFormData.dia_wt_ct !== undefined && editFormData.dia_wt_ct !== null) {
        data.append('dia_wt_ct', editFormData.dia_wt_ct);
      }

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
      fetchDesigns(currentPage);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to update design.';
      showToast(msg, 'error', 'Update Failed');
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete Handlers
  const handleDeleteClick = (design) => {
    setDeleteTarget(design);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await api.delete(`/product-designs/${deleteTarget.id}`);
      showToast('Design deleted successfully', 'success');
      setDeleteTarget(null);
      fetchDesigns(currentPage);
    } catch (err) {
      console.error(err);
      showToast('Failed to delete design', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Open Gallery
  const openGallery = (design) => {
    const urls =
      design.image_urls && design.image_urls.length > 0
        ? design.image_urls
        : Array.isArray(design.image_path)
          ? design.image_path.map((p) => `/storage/${p}`)
          : [];

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
          <p className="text-sm text-gray-500 mt-1">
            Upload designs with image, design number, diamond weight, and net weight
          </p>
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
                            className="relative group cursor-pointer w-12 h-12 rounded-lg overflow-hidden border border-gray-200 shadow-2xs hover:border-[#b01622] transition-colors"
                          >
                            <img
                              src={firstImage}
                              alt={design.design_no}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            {images.length > 1 && (
                              <span className="absolute bottom-0 right-0 bg-black/70 text-white text-[9px] font-bold px-1 rounded-tl">
                                +{images.length - 1}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400">
                            <i className="fa-regular fa-image text-xs"></i>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {design.design_no}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {design.dia_wt_ct ? `${design.dia_wt_ct} ct` : '—'}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {design.net_wt ? `${parseFloat(design.net_wt).toFixed(3)} g` : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {design.status || 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => openGallery(design)}
                            className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 flex items-center justify-center transition-colors cursor-pointer"
                            title="Preview Images"
                          >
                            <i className="fa-regular fa-eye text-xs"></i>
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(design)}
                            className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors cursor-pointer"
                            title="Edit Design"
                          >
                            <i className="fa-solid fa-pen-to-square text-xs"></i>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(design)}
                            className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-colors cursor-pointer"
                            title="Delete Design"
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

        {/* Pagination */}
        {totalDesigns > 0 && (
          <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <span>Show</span>
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-200 rounded px-2 py-1 bg-white text-gray-700"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span>entries</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Previous
              </button>

              {getPageNumbers(currentPage, lastPage).map((p, i) =>
                p === '...' ? (
                  <span key={`dots-${i}`} className="px-2 py-1.5 text-gray-400">
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setCurrentPage(p)}
                    className={`px-3 py-1.5 rounded font-semibold cursor-pointer ${
                      currentPage === p
                        ? 'bg-[#b01622] text-white'
                        : 'border border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                type="button"
                disabled={currentPage >= lastPage}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, lastPage))}
                className="px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Nav / Next */}
      <div className="flex items-center justify-between pt-2">
        <Link
          to="/inventory"
          className="px-6 py-2.5 border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors"
        >
          &larr; Back to Inventory
        </Link>
        <button
          type="button"
          onClick={() => navigate('/product-upload/step2')}
          className="px-8 py-2.5 bg-[#b01622] text-white text-sm font-bold rounded-lg hover:bg-[#90121b] transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
        >
          Next &rarr;
        </button>
      </div>

      {/* ── Add Design Modal (Streamlined Single Form: Image, Design No, Diamond Wt, Net Wt) ── */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg my-8 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-[#b01622] flex items-center justify-center font-bold">
                  <i className="fa-solid fa-gem text-xs"></i>
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 leading-tight">Add New Design</h2>
                  <p className="text-xs text-gray-400">Upload design image and enter specifications</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="text-gray-400 hover:text-gray-600 w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-base"></i>
              </button>
            </div>

            {/* Streamlined Form */}
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              {/* 1. Design Image */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Design Image <span className="text-[#b01622]">*</span>
                </label>
                <div className="relative w-full h-[52px] border-2 border-dashed border-gray-300 hover:border-[#b01622] rounded-xl bg-gray-50/70 hover:bg-white transition-all flex items-center px-4 cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="flex items-center gap-3 text-sm text-gray-600 pointer-events-none truncate">
                    <div className="w-8 h-8 rounded-lg bg-red-50 text-[#b01622] flex items-center justify-center shrink-0">
                      <i className="fa-regular fa-image text-sm"></i>
                    </div>
                    <span className="truncate text-xs font-medium">
                      {selectedFiles.length > 0
                        ? `${selectedFiles.length} file(s) selected`
                        : 'Click or drop jewellery image here...'}
                    </span>
                  </div>
                </div>

                {/* Previews with remove button */}
                {filePreviews.length > 0 && (
                  <div className="flex items-center gap-2 mt-2.5 overflow-x-auto py-1">
                    {filePreviews.map((src, i) => (
                      <div key={i} className="relative group shrink-0">
                        <img
                          src={src}
                          alt="Preview"
                          className="w-14 h-14 rounded-lg object-cover border border-gray-200 shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFiles((prev) => prev.filter((_, idx) => idx !== i));
                            setFilePreviews((prev) => prev.filter((_, idx) => idx !== i));
                          }}
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center opacity-90 hover:opacity-100 cursor-pointer"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Design No */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-700">
                    Design No <span className="text-[#b01622]">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleAutoGenerateCode('add')}
                    className="text-[11px] font-semibold text-[#b01622] hover:text-[#90121b] hover:underline flex items-center gap-1 cursor-pointer"
                    title="Auto-generate a guaranteed unique code"
                  >
                    <i className="fa-solid fa-wand-magic-sparkles text-[10px]"></i> Auto Generate
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Ex: DES-1001"
                    value={formData.design_no}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, design_no: val });
                      checkUniqueness(val, null, 'add');
                    }}
                    className={`w-full px-3.5 h-[42px] bg-gray-50 border rounded-lg text-sm text-gray-800 focus:outline-none transition-colors ${
                      addDesignNoStatus.exists
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

              {/* 3 & 4: Diamond Wt (Ct) and Net Wt (g) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Diamond Wt (Ct) */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Diamond Wt (Ct)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 0.40"
                    value={formData.dia_wt_ct}
                    onChange={(e) => setFormData({ ...formData, dia_wt_ct: e.target.value })}
                    className="w-full px-3.5 h-[42px] bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#b01622] focus:bg-white transition-colors"
                  />
                </div>

                {/* Net Wt (g) */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Net Wt (g) <span className="text-[#b01622]">*</span>
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
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
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
                      Upload Design
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Design Modal (Streamlined Single Form) ── */}
      {isEditOpen && editDesign && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg my-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">
                Edit Design: {editDesign.design_no}
              </h2>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="text-gray-400 hover:text-gray-600 w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-base"></i>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {/* Image Input */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Update Images (Optional - leave blank to keep existing)
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleEditFileChange}
                  className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-[#b01622] hover:file:bg-red-100 cursor-pointer"
                />

                {/* Previews */}
                {editFilePreviews.length > 0 ? (
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
                ) : (
                  editDesign.image_urls &&
                  editDesign.image_urls.length > 0 && (
                    <div className="flex items-center gap-2 mt-2 overflow-x-auto py-1">
                      {editDesign.image_urls.map((src, i) => (
                        <img
                          key={i}
                          src={src}
                          alt="Current"
                          className="w-12 h-12 rounded-md object-cover border border-gray-200 opacity-80"
                        />
                      ))}
                    </div>
                  )
                )}
              </div>

              {/* Design No */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-700">
                    Design No <span className="text-[#b01622]">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleAutoGenerateCode('edit')}
                    className="text-[11px] font-semibold text-[#b01622] hover:text-[#90121b] hover:underline flex items-center gap-1 cursor-pointer"
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
                    className={`w-full px-3.5 h-[42px] bg-gray-50 border rounded-lg text-sm text-gray-800 focus:outline-none transition-colors ${
                      editDesignNoStatus.exists
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

              {/* Diamond Wt and Net Wt */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Diamond Wt (Ct)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 0.40"
                    value={editFormData.dia_wt_ct}
                    onChange={(e) => setEditFormData({ ...editFormData, dia_wt_ct: e.target.value })}
                    className="w-full px-3.5 h-[42px] bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#b01622] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Net Wt (g) <span className="text-[#b01622]">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    placeholder="Ex: 5.850"
                    value={editFormData.net_wt}
                    onChange={(e) => setEditFormData({ ...editFormData, net_wt: e.target.value })}
                    className="w-full px-3.5 h-[42px] bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#b01622] focus:bg-white"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating || editDesignNoStatus.exists}
                  className="px-8 py-2.5 bg-[#b01622] text-white text-sm font-bold rounded-lg hover:bg-[#90121b] transition-colors shadow-md inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-check text-xs"></i>
                      Save Changes
                    </>
                  )}
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
    </div>
  );
}
