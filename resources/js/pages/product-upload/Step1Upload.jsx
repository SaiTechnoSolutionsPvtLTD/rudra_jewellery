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
  const [loading, setLoading] = useState(true);

  // Metadata (gold types, styles, diamond ranges)
  const [goldTypes, setGoldTypes] = useState(['18 Carat', '22 Carat', '24 Carat', '14 Carat']);
  const [styles, setStyles] = useState([]);
  const [diamondRanges, setDiamondRanges] = useState([]);

  // Add Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [formData, setFormData] = useState({
    design_no: '',
    net_wt: '',
    gold_type: '',
    setting_style: '',
    dia_wt_range: '',
    dia_wt_ct: '',
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
    design_no: '',
    net_wt: '',
    gold_type: '',
    setting_style: '',
    dia_wt_ct: '',
  });

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
      if (res.data.gold_types) setGoldTypes(res.data.gold_types);
      if (res.data.styles) setStyles(res.data.styles);
      if (res.data.diamond_ranges) setDiamondRanges(res.data.diamond_ranges);
    } catch (err) {
      console.error('Failed to fetch metadata', err);
    }
  };

  // Fetch Designs
  const fetchDesigns = async (page = 1) => {
    try {
      setLoading(true);
      const res = await api.get(`/product-designs?page=${page}&per_page=10`);
      setDesigns(res.data.data || []);
      setTotalDesigns(res.data.total || 0);
      setCurrentPage(res.data.current_page || 1);
      setLastPage(res.data.last_page || 1);
    } catch (err) {
      console.error('Failed to fetch designs', err);
      showToast('Failed to load designs', 'error');
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
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();

    const finalGoldType = customGoldTypeVisible && customGoldTypeInput.trim() 
      ? customGoldTypeInput.trim() 
      : formData.gold_type;

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
    setEditFormData({
      design_no: design.design_no || '',
      net_wt: design.net_wt || '',
      gold_type: design.gold_type || '',
      setting_style: design.setting_style || '',
      dia_wt_ct: design.dia_wt_ct || '',
    });
    setEditFiles([]);
    setEditFilePreviews([]);
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editDesign) return;

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
                        {(currentPage - 1) * 10 + index + 1}
                      </td>
                      <td className="px-6 py-4 flex justify-center">
                        {firstImage ? (
                          <div
                            onClick={() => openGallery(design)}
                            className="relative w-16 h-16 border border-gray-200 rounded-lg p-1 bg-gray-50 flex items-center justify-center cursor-pointer hover:border-[#b01622] transition-colors"
                            title="Click to view full preview"
                          >
                            <img
                              src={firstImage}
                              alt={design.design_no}
                              className="max-w-full max-h-full object-contain mix-blend-multiply"
                            />
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
                            className="w-8 h-8 rounded-lg text-gray-500 hover:text-[#b01622] hover:bg-red-50 flex items-center justify-center transition-colors"
                            title="View Design"
                          >
                            <i className="fa-solid fa-eye text-sm"></i>
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(design)}
                            className="w-8 h-8 rounded-lg text-gray-500 hover:text-amber-600 hover:bg-amber-50 flex items-center justify-center transition-colors"
                            title="Edit Design"
                          >
                            <i className="fa-solid fa-pen-to-square text-sm"></i>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(design)}
                            className="w-8 h-8 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"
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
        {lastPage > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>
              Showing {(currentPage - 1) * 10 + 1} to {Math.min(currentPage * 10, totalDesigns)} of{' '}
              {totalDesigns} designs
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage <= 1}
                onClick={() => fetchDesigns(currentPage - 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
              >
                Previous
              </button>
              {Array.from({ length: lastPage }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => fetchDesigns(p)}
                  className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
                    p === currentPage
                      ? 'bg-[#b01622] text-white shadow-xs'
                      : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                disabled={currentPage >= lastPage}
                onClick={() => fetchDesigns(currentPage + 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
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
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Design No <span className="text-[#b01622]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: RDP001"
                    value={formData.design_no}
                    onChange={(e) => setFormData({ ...formData, design_no: e.target.value })}
                    className="w-full px-3.5 h-[42px] bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#b01622] focus:bg-white transition-colors"
                  />
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

                {/* Gold Type */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Gold Type <span className="text-[#b01622]">*</span>
                  </label>
                  <select
                    value={formData.gold_type}
                    onChange={(e) => setFormData({ ...formData, gold_type: e.target.value })}
                    className="w-full px-3.5 h-[42px] bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#b01622] focus:bg-white transition-colors"
                  >
                    <option value="">Select Gold Type</option>
                    {goldTypes.map((gt) => (
                      <option key={gt} value={gt}>
                        {gt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Setting Style */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Setting Style <span className="text-[#b01622]">*</span>
                  </label>
                  <select
                    value={formData.setting_style}
                    onChange={(e) => setFormData({ ...formData, setting_style: e.target.value })}
                    className="w-full px-3.5 h-[42px] bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#b01622] focus:bg-white transition-colors"
                  >
                    <option value="">Select Setting Style</option>
                    {styles.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Diamond Wt Range */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Diamond Wt <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <select
                    value={formData.dia_wt_range}
                    onChange={(e) => setFormData({ ...formData, dia_wt_range: e.target.value })}
                    className="w-full px-3.5 h-[42px] bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#b01622] focus:bg-white transition-colors"
                  >
                    <option value="">None / Optional</option>
                    {diamondRanges.map((dr) => (
                      <option key={dr.id} value={dr.code || dr.id}>
                        {dr.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* DIA WT (CT) */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">DIA WT (CT)</label>
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
                  disabled={isUploading}
                  className="px-8 py-2.5 bg-[#b01622] text-white text-sm font-bold rounded-lg hover:bg-[#90121b] transition-colors shadow-md inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
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
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Design No <span className="text-[#b01622]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.design_no}
                    onChange={(e) => setEditFormData({ ...editFormData, design_no: e.target.value })}
                    className="w-full px-3.5 h-[42px] bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#b01622] focus:bg-white"
                  />
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
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Gold Type</label>
                  <select
                    value={editFormData.gold_type}
                    onChange={(e) => setEditFormData({ ...editFormData, gold_type: e.target.value })}
                    className="w-full px-3.5 h-[42px] bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#b01622] focus:bg-white"
                  >
                    <option value="">Select Gold Type</option>
                    {goldTypes.map((gt) => (
                      <option key={gt} value={gt}>
                        {gt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Setting Style</label>
                  <select
                    value={editFormData.setting_style}
                    onChange={(e) => setEditFormData({ ...editFormData, setting_style: e.target.value })}
                    className="w-full px-3.5 h-[42px] bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#b01622] focus:bg-white"
                  >
                    <option value="">Select Setting Style</option>
                    {styles.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
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
                  disabled={isUpdating}
                  className="px-8 py-2.5 bg-[#b01622] text-white text-sm font-bold rounded-lg hover:bg-[#90121b] transition-colors shadow-md inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
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
        confirmText={deleting ? 'Deleting...' : 'Delete'}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
