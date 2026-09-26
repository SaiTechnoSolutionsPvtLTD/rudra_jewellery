import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ProductUploadStepNav from './ProductUploadStepNav';
import { useProductSelection } from './useProductSelection';
import ImageGalleryModal from '../../components/ImageGalleryModal';

export default function Step4Download() {
  const { showToast } = useToast();
  const { selectedIds, selectedCount, removeSelection } = useProductSelection();

  const [designs, setDesigns] = useState([]);
  const [totalDesigns, setTotalDesigns] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [loading, setLoading] = useState(true);

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

  // Lightbox
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryDetails, setGalleryDetails] = useState({});
  const [galleryOpen, setGalleryOpen] = useState(false);

  const fetchSelectedDesigns = async (page = 1, requestedPerPage = perPage) => {
    if (selectedIds.length === 0) {
      setDesigns([]);
      setTotalDesigns(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('per_page', requestedPerPage);
      params.append('ids', selectedIds.join(','));

      const res = await api.get(`/product-designs?${params.toString()}`);
      setDesigns(res.data.data || []);
      setTotalDesigns(res.data.total || 0);
      setCurrentPage(res.data.current_page || 1);
      setLastPage(res.data.last_page || 1);
    } catch (err) {
      console.error(err);
      showToast('Failed to load selected designs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSelectedDesigns(1);
  }, [selectedIds.length]);

  const handleRemove = (design) => {
    removeSelection(design.id);
    showToast(`Design ${design.design_no} removed from selection`, 'info', 'Removed');
  };

  const handleDownload = (type) => {
    if (selectedIds.length === 0) {
      showToast('No designs selected to export', 'error');
      return;
    }

    const params = new URLSearchParams();
    params.append('ids', selectedIds.join(','));

    const endpoint = type === 'excel'
      ? `/product-designs/export-excel?${params.toString()}`
      : `/product-designs/export-pdf?${params.toString()}`;

    window.open(`/api${endpoint}`, '_blank');
  };

  const openGallery = (design) => {
    const urls = design.image_urls || [];
    if (urls.length === 0) return;

    setGalleryImages(urls);
    setGalleryDetails({
      design_no: design.design_no,
      net_wt: design.net_wt,
      dia_wt: design.dia_wt_ct,
    });
    setGalleryOpen(true);
  };

  const handleShareWhatsApp = () => {
    if (selectedCount === 0 || designs.length === 0) {
      showToast('No designs selected to share', 'error');
      return;
    }
    const summary = designs.slice(0, 10).map((d, i) => `${i + 1}. SKU: ${d.design_no} | Purity: ${d.gold_type || '22K'} | Net Wt: ${d.net_wt ? Number(d.net_wt).toFixed(3) : '1.5'}g | Dia Wt: ${d.dia_wt_ct || '0.50'}ct`).join('%0A');
    const text = `*RUDRA JEWELLERS - DIGITAL PRODUCT CATALOG*%0A%0ASelected Catalog Items (%2A${selectedCount} Items%2A):%0A%0A${summary}%0A%0AView & download full digital catalog: ${window.location.origin}/product-upload/step4`;
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleCopyShareLink = () => {
    const url = `${window.location.origin}/product-upload/step4`;
    navigator.clipboard.writeText(url);
    showToast('Catalog share link copied to clipboard!', 'success');
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Top Step Nav */}
      <ProductUploadStepNav currentStep={4} />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-5 gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <span>Selected Designs &amp; Share Catalog</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">{selectedCount} Designs selected for digital catalog export &amp; sharing</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleShareWhatsApp}
            disabled={selectedCount === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <i className="fa-brands fa-whatsapp text-sm"></i>
            <span>Share via WhatsApp</span>
          </button>
          <button
            type="button"
            onClick={handleCopyShareLink}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer"
          >
            <i className="fa-solid fa-link text-stone-500"></i>
            <span>Copy Link</span>
          </button>
          <button
            type="button"
            onClick={() => handleDownload('excel')}
            disabled={selectedCount === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <i className="fa-solid fa-file-excel text-emerald-600"></i>
            <span>Excel</span>
          </button>
          <button
            type="button"
            onClick={() => handleDownload('pdf')}
            disabled={selectedCount === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#b01622] bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <i className="fa-solid fa-file-pdf text-[#b01622]"></i>
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* Final Selected Designs Table */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-gray-200/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-6 py-4 w-16">S.NO</th>
                <th className="px-6 py-4 w-28">PREVIEW</th>
                <th className="px-6 py-4">DESIGN NO</th>
                <th className="px-6 py-4">DIA WT (CT)</th>
                <th className="px-6 py-4">NET WT (G)</th>
                <th className="px-6 py-4 text-center w-28">ACTION</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-7 h-7 border-2 border-[#b01622] border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs">Loading selected designs...</span>
                    </div>
                  </td>
                </tr>
              ) : selectedCount === 0 || designs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-400 text-sm">
                    No designs selected. Go back to{' '}
                    <Link to="/product-upload/step2" className="text-[#b01622] font-semibold hover:underline">
                      Step 2
                    </Link>{' '}
                    or{' '}
                    <Link to="/product-upload/step3" className="text-[#b01622] font-semibold hover:underline">
                      Step 3
                    </Link>{' '}
                    to select designs.
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
                      <td className="px-6 py-4">
                        {firstImage ? (
                          <div
                            onClick={() => openGallery(design)}
                            className="w-14 h-14 rounded-lg border border-gray-200 bg-white p-1 flex items-center justify-center cursor-pointer shadow-xs hover:border-[#b01622] transition-colors"
                            title="Click to view full preview"
                          >
                            <img
                              src={firstImage}
                              alt={design.design_no}
                              className="max-w-full max-h-full object-contain mix-blend-multiply"
                            />
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-400 text-xs">
                            No Image
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900 text-sm">{design.design_no}</td>
                      <td className="px-6 py-4 text-gray-600 text-sm font-medium">{design.dia_wt_ct || '-'}</td>
                      <td className="px-6 py-4 text-gray-600 text-sm font-medium">
                        {design.net_wt ? Number(design.net_wt).toFixed(3) : '-'}
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
                            onClick={() => handleRemove(design)}
                            className="w-8 h-8 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
                            title="Remove from selection"
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
                  fetchSelectedDesigns(1, newPerPage);
                }}
                className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 outline-none focus:border-[#b01622] cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => fetchSelectedDesigns(currentPage - 1)}
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
                  onClick={() => fetchSelectedDesigns(p)}
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
              onClick={() => fetchSelectedDesigns(currentPage + 1)}
              className="px-3.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors cursor-pointer bg-white shadow-xs"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex items-center justify-between pt-2">
        <Link
          to="/product-upload/step3"
          className="px-6 py-2.5 bg-white border border-gray-300 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors shadow-xs inline-flex items-center gap-2"
        >
          &larr; Back to Selection
        </Link>
      </div>

      {/* Lightbox / Gallery Modal */}
      <ImageGalleryModal
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        images={galleryImages}
        title={galleryDetails.design_no ? `Design: ${galleryDetails.design_no}` : 'Preview'}
        details={galleryDetails}
      />
    </div>
  );
}
