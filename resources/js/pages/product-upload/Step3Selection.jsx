import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ProductUploadStepNav from './ProductUploadStepNav';
import { useProductSelection } from './useProductSelection';
import ImageGalleryModal from '../../components/ImageGalleryModal';

export default function Step3Selection() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { selectedIds, selectedCount, toggleSelection, isSelected, setSelectedIds, clearSelection } = useProductSelection();

  const [designs, setDesigns] = useState([]);
  const [totalDesigns, setTotalDesigns] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Metadata
  const [goldTypes, setGoldTypes] = useState(['18 Carat', '22 Carat', '24 Carat', '14 Carat']);
  const [styles, setStyles] = useState([]);
  const [diamondRanges, setDiamondRanges] = useState([]);

  // Filters
  const [filters, setFilters] = useState({
    gold_type: '',
    setting_style: '',
    net_wt_from: '',
    net_wt_to: '',
    dia_wt_range: '',
    search: '',
  });

  // Lightbox
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryDetails, setGalleryDetails] = useState({});
  const [galleryOpen, setGalleryOpen] = useState(false);

  const fetchMeta = async () => {
    try {
      const res = await api.get('/product-designs/meta');
      if (res.data.gold_types) setGoldTypes(res.data.gold_types);
      if (res.data.styles) setStyles(res.data.styles);
      if (res.data.diamond_ranges) setDiamondRanges(res.data.diamond_ranges);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDesigns = async (page = 1, customFilters = filters) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('per_page', 20);

      if (customFilters.gold_type) params.append('gold_type', customFilters.gold_type);
      if (customFilters.setting_style) params.append('setting_style', customFilters.setting_style);
      if (customFilters.net_wt_from) params.append('net_wt_from', customFilters.net_wt_from);
      if (customFilters.net_wt_to) params.append('net_wt_to', customFilters.net_wt_to);
      if (customFilters.dia_wt_range) params.append('dia_wt_range', customFilters.dia_wt_range);
      if (customFilters.search) params.append('search', customFilters.search);

      const res = await api.get(`/product-designs?${params.toString()}`);
      setDesigns(res.data.data || []);
      setTotalDesigns(res.data.total || 0);
      setCurrentPage(res.data.current_page || 1);
      setLastPage(res.data.last_page || 1);
    } catch (err) {
      console.error(err);
      showToast('Failed to load designs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeta();
    fetchDesigns(1);
  }, []);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchDesigns(1, filters);
  };

  const handleClearFilters = () => {
    const cleared = {
      gold_type: '',
      setting_style: '',
      net_wt_from: '',
      net_wt_to: '',
      dia_wt_range: '',
      search: '',
    };
    setFilters(cleared);
    fetchDesigns(1, cleared);
  };

  const handleSelectAllOnPage = () => {
    const pageIds = designs.map((d) => d.id);
    const combined = Array.from(new Set([...selectedIds, ...pageIds]));
    setSelectedIds(combined);
    showToast(`Selected ${pageIds.length} designs on this page`, 'success');
  };

  const handleDeselectAll = () => {
    clearSelection();
    showToast('Cleared all selected designs', 'info');
  };

  const openGallery = (e, design) => {
    e.stopPropagation();
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

  const handleProceedToExport = () => {
    if (selectedCount === 0) {
      showToast('Please select at least one design before proceeding to export', 'error', 'Selection Required');
      return;
    }
    navigate('/product-upload/step4');
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Top Step Nav */}
      <ProductUploadStepNav currentStep={3} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Product Selection</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Select designs for client review and export. Click any card to select or deselect.
          </p>
        </div>

        {/* Selected Count & Quick Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleSelectAllOnPage}
            disabled={designs.length === 0}
            className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer disabled:opacity-40"
          >
            Select All
          </button>
          {selectedCount > 0 && (
            <button
              type="button"
              onClick={handleDeselectAll}
              className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
            >
              Deselect All
            </button>
          )}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-red-50 text-[#b01622] font-semibold text-xs rounded-lg border border-red-200 shadow-xs">
            <i className="fa-regular fa-square-check text-sm"></i>
            <span>
              Selected : <strong className="font-bold text-sm">{selectedCount}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white px-5 py-4 rounded-xl border border-gray-200/80 shadow-xs mb-5">
        <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-600 font-medium mb-1.5">Gold Type</label>
            <select
              value={filters.gold_type}
              onChange={(e) => setFilters({ ...filters, gold_type: e.target.value })}
              className="w-full h-[40px] px-3 bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-[#b01622]"
            >
              <option value="">All Gold Types</option>
              {goldTypes.map((gt) => (
                <option key={gt} value={gt}>
                  {gt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600 font-medium mb-1.5">Setting Style</label>
            <select
              value={filters.setting_style}
              onChange={(e) => setFilters({ ...filters, setting_style: e.target.value })}
              className="w-full h-[40px] px-3 bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-[#b01622]"
            >
              <option value="">All Styles</option>
              {styles.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600 font-medium mb-1.5">Gold Wt (From)</label>
            <div className="relative">
              <input
                type="number"
                step="0.001"
                placeholder="0.000"
                value={filters.net_wt_from}
                onChange={(e) => setFilters({ ...filters, net_wt_from: e.target.value })}
                className="w-full h-[40px] pl-3 pr-7 bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-[#b01622]"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">g</span>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-600 font-medium mb-1.5">Gold Wt (To)</label>
            <div className="relative">
              <input
                type="number"
                step="0.001"
                placeholder="0.000"
                value={filters.net_wt_to}
                onChange={(e) => setFilters({ ...filters, net_wt_to: e.target.value })}
                className="w-full h-[40px] pl-3 pr-7 bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-[#b01622]"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">g</span>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-600 font-medium mb-1.5">Diamond Wt</label>
            <select
              value={filters.dia_wt_range}
              onChange={(e) => setFilters({ ...filters, dia_wt_range: e.target.value })}
              className="w-full h-[40px] px-3 bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-[#b01622]"
            >
              <option value="">All Diamond Wts</option>
              {diamondRanges.map((dr) => (
                <option key={dr.id} value={dr.code || dr.id}>
                  {dr.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearFilters}
              className="h-[40px] flex-1 inline-flex items-center justify-center text-xs font-semibold text-gray-600 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
            >
              Clear
            </button>
            <button
              type="submit"
              className="h-[40px] flex-1 inline-flex items-center justify-center text-xs font-bold text-white bg-[#b01622] rounded-lg hover:bg-[#90121b] transition-colors shadow-xs cursor-pointer"
            >
              Filter
            </button>
          </div>
        </form>
      </div>

      {/* Design Selection Grid */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs py-20 flex flex-col items-center justify-center gap-2">
          <div className="w-8 h-8 border-2 border-[#b01622] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-gray-500">Loading designs for selection...</span>
        </div>
      ) : designs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs py-20 flex flex-col items-center justify-center text-gray-400">
          <i className="fa-regular fa-folder-open text-4xl mb-3 text-gray-300"></i>
          <p className="text-sm font-semibold text-gray-700">No designs found</p>
          <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {designs.map((design) => {
            const active = isSelected(design.id);
            const images = design.image_urls || [];
            const firstImage = images.length > 0 ? images[0] : null;

            return (
              <div
                key={design.id}
                onClick={() => toggleSelection(design.id)}
                className={`relative bg-white rounded-2xl cursor-pointer select-none flex flex-col transition-all duration-150 border-2 overflow-hidden group ${
                  active
                    ? 'border-[#b01622] shadow-md shadow-red-900/15 ring-2 ring-red-500/20'
                    : 'border-gray-200 hover:border-gray-300 shadow-xs hover:shadow-sm'
                }`}
              >
                {/* 60% Image Region */}
                <div className="relative p-3 bg-white" style={{ flex: '0 0 62%' }}>
                  {/* Interactive Checkbox at top-right */}
                  <div className="absolute top-4 right-4 z-10">
                    <div
                      className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                        active
                          ? 'bg-[#b01622] border-[#b01622] text-white shadow-xs scale-105'
                          : 'bg-white/95 border-gray-300 text-transparent group-hover:border-gray-400'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5 stroke-current" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>

                  {/* Zoom button on hover */}
                  {firstImage && (
                    <button
                      type="button"
                      onClick={(e) => openGallery(e, design)}
                      className="absolute top-4 left-4 z-10 w-6 h-6 rounded-md bg-black/40 hover:bg-black/70 text-white text-[11px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Preview Images"
                    >
                      <i className="fa-solid fa-up-right-and-down-left-from-center text-[9px]"></i>
                    </button>
                  )}

                  <div className="w-full h-36 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden border border-gray-100">
                    {firstImage ? (
                      <img
                        src={firstImage}
                        alt={design.design_no}
                        className="w-full h-full object-cover rounded-xl transition-transform duration-200 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-gray-300">
                        <i className="fa-regular fa-image text-3xl"></i>
                        <span className="text-[10px] text-gray-400">No Image</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 40% Text Details */}
                <div className="px-4 pb-4 pt-1 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="text-[13px] font-bold text-gray-900 mb-1 flex items-center justify-between">
                      <span className="truncate">Design NO : {design.design_no}</span>
                    </div>
                    <div className="text-xs text-gray-500 space-y-0.5 leading-relaxed">
                      <div>Dia : <span className="text-gray-800 font-medium">{design.dia_wt_ct || '-'} ct</span></div>
                      <div>Net Wt : <span className="text-gray-800 font-medium">{design.net_wt ? Number(design.net_wt).toFixed(3) : '-'} g</span></div>
                    </div>
                  </div>

                  {design.gold_type && (
                    <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                      <span className="text-gray-400">{design.gold_type}</span>
                      {design.setting_style && <span className="text-gray-400">{design.setting_style}</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {lastPage > 1 && (
        <div className="mt-6 flex items-center justify-between text-xs text-gray-500">
          <span>
            Showing {(currentPage - 1) * 20 + 1} to {Math.min(currentPage * 20, totalDesigns)} of {totalDesigns} designs
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled={currentPage <= 1}
              onClick={() => fetchDesigns(currentPage - 1)}
              className="px-3.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
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
              className="px-3.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="flex items-center justify-between mt-8">
        <Link
          to="/product-upload/step2"
          className="inline-flex items-center gap-2 px-6 h-[42px] text-sm font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-xs"
        >
          <i className="fa-solid fa-chevron-left text-[10px]"></i> Back to Catalog
        </Link>
        <button
          type="button"
          onClick={handleProceedToExport}
          className="inline-flex items-center gap-2 px-8 h-[42px] text-sm font-bold text-white bg-[#b01622] rounded-lg hover:bg-[#90121b] transition-colors shadow-sm cursor-pointer"
        >
          Proceed to Export ({selectedCount}) <i className="fa-solid fa-chevron-right text-[10px]"></i>
        </button>
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
