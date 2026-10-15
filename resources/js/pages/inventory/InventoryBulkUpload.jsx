import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function InventoryBulkUpload() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Preview Modal & Results State
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [expandedProducts, setExpandedProducts] = useState({});

  // Download Sample Excel Template
  const downloadSampleExcel = async () => {
    try {
      showToast('Generating sample multi-component Excel template...', 'info');
      const response = await api.get('/inventory/sample-excel', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'rudhra_products_bulk_upload_sample.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast('Sample Excel workbook downloaded successfully!', 'success');
    } catch (err) {
      console.error('Failed to download Excel sample:', err);
      // Fallback direct window download
      window.open('/api/inventory/sample-excel', '_blank');
    }
  };

  // Download Sample CSV Template
  const downloadSampleCSV = async () => {
    try {
      showToast('Generating sample multi-component CSV template...', 'info');
      const response = await api.get('/inventory/sample-csv', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'rudhra_products_bulk_upload_sample.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast('Sample CSV template downloaded successfully!', 'success');
    } catch (err) {
      console.error('Failed to download CSV sample:', err);
      window.open('/api/inventory/sample-csv', '_blank');
    }
  };

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    const name = selectedFile.name.toLowerCase();
    if (!name.endsWith('.csv') && !name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.txt')) {
      showToast('Please upload a valid Excel (.xlsx, .xls) or CSV (.csv, .txt) file', 'error');
      return;
    }

    setFile(selectedFile);
    setFileInfo({
      name: selectedFile.name,
      size: (selectedFile.size / 1024).toFixed(1) + ' KB',
      isExcel: name.endsWith('.xlsx') || name.endsWith('.xls'),
    });
    setPreviewData(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Request Server Validation and Grouped Preview
  const handleUploadAndPreview = async () => {
    if (!file) {
      fileInputRef.current?.click();
      return;
    }

    setPreviewLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/inventory/bulk-upload/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.preview) {
        setPreviewData(res.data.preview);
        // Expand first 3 products by default
        const initExpanded = {};
        (res.data.preview.products || []).slice(0, 3).forEach((p, idx) => {
          initExpanded[p.product_code || idx] = true;
        });
        setExpandedProducts(initExpanded);
        setShowPreviewModal(true);

        if (!res.data.preview.is_valid) {
          showToast(`File has ${res.data.preview.errors?.length || 0} validation issue(s). Please review.`, 'warning');
        } else {
          showToast(`Parsed ${res.data.preview.products?.length || 0} products ready for import!`, 'success');
        }
      }
    } catch (err) {
      console.error('Preview request failed:', err);
      const data = err.response?.data;
      const errMsg = data?.message || 'Failed to inspect file. Please verify file format.';
      showToast(errMsg, 'error');
    } finally {
      setPreviewLoading(false);
    }
  };

  const toggleProductExpand = (pCode) => {
    setExpandedProducts((prev) => ({
      ...prev,
      [pCode]: !prev[pCode],
    }));
  };

  // Final submission to API
  const handleConfirmImport = async () => {
    if (!file) return;
    if (previewData && !previewData.is_valid) {
      showToast('Cannot import file with validation errors. Please fix errors first.', 'error');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/inventory/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      showToast(res.data?.message || 'Inventory products & components imported successfully!', 'success', 'Import Complete');
      setShowPreviewModal(false);
      setTimeout(() => {
        navigate('/inventory');
      }, 900);
    } catch (err) {
      console.error('Import failed:', err);
      const data = err.response?.data;
      const errMsg = data?.message || 'Upload failed. Please verify format.';
      showToast(errMsg, 'error');
      if (data?.errors && Array.isArray(data.errors) && previewData) {
        setPreviewData((prev) => ({
          ...prev,
          is_valid: false,
          errors: data.errors,
        }));
      }
    } finally {
      setUploading(false);
    }
  };

  const stats = previewData?.stats || {};
  const products = previewData?.products || [];
  const errors = previewData?.errors || [];
  const warnings = previewData?.warnings || [];

  return (
    <div className="w-full min-h-[calc(100vh-80px)] py-6 px-4 sm:px-8 font-['Inter',-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif]">
      <div className="max-w-4xl mx-auto space-y-5">
        
        {/* Top Header Section */}
        <div>
          <button
            type="button"
            onClick={() => navigate('/inventory')}
            className="text-stone-400 hover:text-stone-700 text-sm flex items-center gap-1.5 transition-colors cursor-pointer mb-2 font-medium"
          >
            <i className="fa-solid fa-angle-left text-xs"></i>
            <span>Back to Inventory</span>
          </button>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight">
                Bulk Inventory Upload
              </h1>
              <p className="text-xs sm:text-sm text-stone-500 mt-1">
                Import complete jewellery products with multiple diamond sizes, coloured stones, and component breakdowns.
              </p>
            </div>

            {/* Template Download Quick Buttons */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={downloadSampleExcel}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-2xs cursor-pointer"
                title="Download 2-sheet Excel Template (Products & Components)"
              >
                <i className="fa-solid fa-file-excel text-emerald-600"></i>
                <span>Excel Template (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={downloadSampleCSV}
                className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-2xs cursor-pointer"
                title="Download Unified CSV Template with repeated component rows"
              >
                <i className="fa-solid fa-file-csv text-[#800000]"></i>
                <span>CSV Template (.csv)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Feature Highlights Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white border border-stone-200/90 rounded-xl p-3.5 flex items-start gap-3 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-red-50 text-[#800000] flex items-center justify-center text-sm shrink-0">
              <i className="fa-regular fa-gem"></i>
            </div>
            <div className="text-xs">
              <div className="font-bold text-stone-900">Multi-Component Support</div>
              <div className="text-stone-500 text-[11px] mt-0.5">
                Multiple diamond sizes (A, B, C), grades, and colored gemstones on a single SKU.
              </div>
            </div>
          </div>

          <div className="bg-white border border-stone-200/90 rounded-xl p-3.5 flex items-start gap-3 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center text-sm shrink-0">
              <i className="fa-solid fa-table"></i>
            </div>
            <div className="text-xs">
              <div className="font-bold text-stone-900">Normalized 2-Sheet Excel</div>
              <div className="text-stone-500 text-[11px] mt-0.5">
                'Products' sheet linked to 'Components' sheet via Product Code / SKU.
              </div>
            </div>
          </div>

          <div className="bg-white border border-stone-200/90 rounded-xl p-3.5 flex items-start gap-3 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center text-sm shrink-0">
              <i className="fa-solid fa-shield-halved"></i>
            </div>
            <div className="text-xs">
              <div className="font-bold text-stone-900">Dynamic Master Validation</div>
              <div className="text-stone-500 text-[11px] mt-0.5">
                Verifies Category, Subcategory compatibility, Karats, Stamps, and Units before commit.
              </div>
            </div>
          </div>
        </div>

        {/* Main Card Container */}
        <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-6 sm:p-10 space-y-6">
          
          {/* Drag & Drop File Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`bg-white rounded-2xl border transition-all cursor-pointer text-center flex flex-col items-center justify-center min-h-[240px] p-8 ${
              dragOver
                ? 'border-[#800000] bg-red-50/30 ring-2 ring-red-100'
                : fileInfo
                ? 'border-emerald-300 bg-emerald-50/10'
                : 'border-stone-200/90 hover:border-stone-300 hover:bg-stone-50/40'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileSelect(e.target.files[0])}
              accept=".csv,.xlsx,.xls,.txt"
              className="hidden"
            />

            {/* Circular Upload Icon */}
            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-4 transition-transform group-hover:scale-105 ${
              fileInfo
                ? fileInfo.isExcel ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-[#800000]'
                : 'bg-[#fdf2f2] text-[#800000]'
            }`}>
              {fileInfo ? (
                <i className={`fa-solid ${fileInfo.isExcel ? 'fa-file-excel text-2xl text-emerald-700' : 'fa-file-csv text-2xl text-[#800000]'}`}></i>
              ) : (
                <svg
                  className="w-7 h-7 sm:w-8 sm:h-8 fill-current text-[#800000]"
                  viewBox="0 0 24 24"
                >
                  <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
                </svg>
              )}
            </div>

            {fileInfo ? (
              <div className="space-y-2">
                <div className="text-base font-bold text-stone-900 flex items-center justify-center gap-2">
                  <span>{fileInfo.name}</span>
                  <span className="text-xs text-stone-400 font-normal">({fileInfo.size})</span>
                </div>
                <p className="text-xs text-emerald-600 font-semibold flex items-center justify-center gap-1">
                  <i className="fa-solid fa-circle-check"></i>
                  <span>Ready for server verification &amp; preview</span>
                </p>
                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setFileInfo(null);
                      setPreviewData(null);
                    }}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-800 underline cursor-pointer"
                  >
                    Remove File
                  </button>
                  <span className="text-stone-300">|</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="text-xs font-semibold text-stone-600 hover:text-stone-900 underline cursor-pointer"
                  >
                    Change File
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-base sm:text-lg font-bold text-[#111827] tracking-tight">
                  Drop Excel (.xlsx) or CSV file here, or click to browse
                </h2>
                <p className="text-xs sm:text-sm text-stone-400 mt-1">
                  Supports two-sheet Excel workbooks &amp; multi-component CSV formats
                </p>
              </>
            )}
          </div>

          {/* Subtle Horizontal Divider */}
          <hr className="border-t border-stone-200/70" />

          {/* Bottom Footer Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Left side info text */}
            <div className="flex items-center gap-2 text-stone-500 text-xs sm:text-sm font-medium">
              <div className="w-4 h-4 rounded-full border border-stone-400 flex items-center justify-center text-[10px] font-serif font-bold text-stone-600 shrink-0">
                i
              </div>
              <span>Uploads are pre-validated before committing to database.</span>
            </div>

            {/* Right side Upload & Preview Button */}
            <button
              type="button"
              onClick={handleUploadAndPreview}
              disabled={previewLoading || !file}
              className="w-full sm:w-auto px-7 py-3 bg-[#800000] hover:bg-[#680000] active:bg-[#520000] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-red-950/15 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {previewLoading ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                  <span>Validating File...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-magnifying-glass-chart text-xs"></i>
                  <span>Inspect &amp; Preview</span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>

      {/* Interactive Preview & Validation Modal */}
      {showPreviewModal && previewData && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#800000] text-white flex items-center justify-center text-base font-bold shadow-xs">
                  <i className="fa-solid fa-boxes-stacked"></i>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-stone-900">
                    Bulk Import Verification &amp; Preview
                  </h3>
                  <p className="text-xs text-stone-500">
                    Source: <span className="font-semibold text-stone-700">{fileInfo?.name}</span> &bull; {products.length} Products detected
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="w-8 h-8 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 flex items-center justify-center transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            {/* Statistics Banner Cards */}
            <div className="px-5 py-3.5 bg-stone-100/70 border-b border-stone-200/80 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-stone-200">
                <div className="text-[10px] font-bold text-stone-400 uppercase">Products</div>
                <div className="text-sm font-extrabold text-stone-900 font-mono mt-0.5">
                  {stats.total_products || products.length}
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-stone-200">
                <div className="text-[10px] font-bold text-stone-400 uppercase">Components</div>
                <div className="text-sm font-extrabold text-[#800000] font-mono mt-0.5">
                  {stats.total_components || 0}
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-stone-200">
                <div className="text-[10px] font-bold text-stone-400 uppercase">Net Gold Wt</div>
                <div className="text-sm font-extrabold text-stone-900 font-mono mt-0.5">
                  {Number(stats.total_gold_weight || 0).toFixed(3)}g
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-stone-200">
                <div className="text-[10px] font-bold text-stone-400 uppercase">Diamonds</div>
                <div className="text-sm font-extrabold text-stone-900 font-mono mt-0.5">
                  {Number(stats.total_diamond_carats || 0).toFixed(3)} ct
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-stone-200">
                <div className="text-[10px] font-bold text-stone-400 uppercase">Colour Stones</div>
                <div className="text-sm font-extrabold text-stone-900 font-mono mt-0.5">
                  {Number(stats.total_stone_weight || 0).toFixed(3)}g
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-stone-200">
                <div className="text-[10px] font-bold text-stone-400 uppercase">Total Qty</div>
                <div className="text-sm font-extrabold text-emerald-700 font-mono mt-0.5">
                  {stats.total_quantity || products.length} Pcs
                </div>
              </div>
            </div>

            {/* Validation Alerts (Blocking Errors) */}
            {errors.length > 0 && (
              <div className="mx-5 mt-4 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-rose-800">
                  <i className="fa-solid fa-circle-exclamation text-rose-600"></i>
                  <span>Validation Blockers ({errors.length}) — Cannot save until corrected:</span>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1 pr-2">
                  {errors.map((err, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-[11px] text-rose-700 font-medium">
                      <span className="font-mono text-rose-800 font-bold shrink-0">
                        [{err.sheet || 'File'} : Row {err.row || '?'}]
                      </span>
                      <span>{err.reason || JSON.stringify(err)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings (Non-blocking) */}
            {warnings.length > 0 && (
              <div className="mx-5 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
                <div className="flex items-center gap-2 font-bold text-amber-800">
                  <i className="fa-solid fa-triangle-exclamation text-amber-600"></i>
                  <span>Notice / Warnings ({warnings.length}):</span>
                </div>
                <div className="max-h-24 overflow-y-auto space-y-1 mt-1 pr-2">
                  {warnings.map((w, idx) => (
                    <div key={idx} className="text-[11px] text-amber-800">
                      <span className="font-mono font-bold">[{w.sheet || 'File'} : Row {w.row || '?'}]</span> {w.reason}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Grouped Products Body */}
            <div className="p-5 overflow-y-auto flex-1 max-h-[50vh] space-y-3">
              {products.length === 0 ? (
                <div className="py-12 text-center text-stone-400 text-sm font-medium">
                  No products detected in file. Please ensure sheet headers match the sample template.
                </div>
              ) : (
                products.map((p, idx) => {
                  const isExp = expandedProducts[p.product_code || idx];
                  const compList = p.components || [];

                  return (
                    <div
                      key={p.product_code || idx}
                      className="border border-stone-200 rounded-xl overflow-hidden bg-white shadow-2xs transition-all"
                    >
                      {/* Product Header Row */}
                      <div
                        onClick={() => toggleProductExpand(p.product_code || idx)}
                        className="p-3.5 bg-stone-50 hover:bg-stone-100/70 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none"
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="w-6 h-6 rounded-md bg-stone-200 text-stone-600 flex items-center justify-center text-xs shrink-0"
                          >
                            <i className={`fa-solid ${isExp ? 'fa-angle-up' : 'fa-angle-down'}`}></i>
                          </button>

                          {p.image_url ? (
                            <img
                              src={p.image_url}
                              alt={p.product_name}
                              className="w-9 h-9 rounded-lg object-cover border border-stone-200 shrink-0 bg-stone-100"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400 text-xs shrink-0">
                              <i className="fa-regular fa-image"></i>
                            </div>
                          )}

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-extrabold text-[#800000] text-xs">
                                {p.product_code}
                              </span>
                              <span className="font-bold text-stone-900 text-xs">
                                {p.product_name}
                              </span>
                              {p.design_no && (
                                <span className="text-[10px] font-mono text-stone-500 bg-stone-200/80 px-1.5 py-0.2 rounded">
                                  {p.design_no}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-stone-500 mt-0.5">
                              {p.category_name} {p.subcategory_name ? `> ${p.subcategory_name}` : ''} &bull; {p.karat} ({p.purity_percent}%) &bull; Stamp: {p.gold_stamp || 'Standard'}
                            </div>
                          </div>
                        </div>

                        {/* Right side product stats */}
                        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap text-xs">
                          <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 font-mono font-semibold border border-stone-200">
                            Gold: {Number(p.gold_weight || 0).toFixed(3)}g
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 font-mono font-semibold border border-stone-200">
                            Gross: {Number(p.gross_weight || 0).toFixed(3)}g
                          </span>
                          <span className={`px-2 py-0.5 rounded-md font-semibold text-[11px] border ${
                            compList.length > 0
                              ? 'bg-red-50 text-[#800000] border-red-200'
                              : 'bg-stone-100 text-stone-600 border-stone-200'
                          }`}>
                            <i className="fa-solid fa-layer-group mr-1 text-[10px]"></i>
                            {compList.length} Component{compList.length === 1 ? '' : 's'}
                          </span>
                        </div>
                      </div>

                      {/* Expanded Components Breakdown */}
                      {isExp && (
                        <div className="p-4 bg-white border-t border-stone-200 space-y-3">
                          {compList.length === 0 ? (
                            <div className="py-2 px-3 text-stone-500 text-xs italic bg-stone-50 rounded-lg">
                              No distinct stone or sub-component entries attached. Imported as plain gold product ({Number(p.gold_weight || 0).toFixed(3)}g {p.karat}).
                            </div>
                          ) : (
                            <div className="border border-stone-200 rounded-lg overflow-hidden">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="bg-stone-100/80 text-stone-600 font-bold uppercase text-[10px] tracking-wider border-b border-stone-200">
                                    <th className="py-2 px-3 w-12 text-center">S.No</th>
                                    <th className="py-2 px-3">Component / Stone</th>
                                    <th className="py-2 px-3">Type</th>
                                    <th className="py-2 px-3">Stamp / Sieve Size</th>
                                    <th className="py-2 px-3 text-center">Pieces</th>
                                    <th className="py-2 px-3 text-right">Weight</th>
                                    <th className="py-2 px-3 text-center">Unit</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                  {compList.map((c, cIdx) => (
                                    <tr key={cIdx} className="hover:bg-stone-50/60 transition-colors">
                                      <td className="py-2 px-3 text-center font-mono text-[10px] text-stone-400">
                                        {cIdx + 1}
                                      </td>
                                      <td className="py-2 px-3 font-semibold text-stone-900">
                                        {c.item_name || c.stone_type || `Component ${cIdx + 1}`}
                                      </td>
                                      <td className="py-2 px-3">
                                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                          c.is_diamond
                                            ? 'bg-red-50 text-[#800000]'
                                            : c.is_stone
                                            ? 'bg-amber-50 text-amber-800'
                                            : 'bg-stone-100 text-stone-700'
                                        }`}>
                                          {c.component_type}
                                        </span>
                                      </td>
                                      <td className="py-2 px-3 font-mono font-bold text-stone-800">
                                        {c.stamp || c.size || '—'}
                                      </td>
                                      <td className="py-2 px-3 text-center font-mono font-bold text-stone-900">
                                        {c.no_of_pieces || 1}
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono font-bold text-stone-900">
                                        {Number(c.stone_weight || c.gross_wt || 0).toFixed(3)}
                                      </td>
                                      <td className="py-2 px-3 text-center font-mono text-stone-600">
                                        {c.unit || (c.is_diamond ? 'ct' : 'g')}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* Extra Product Attributes Summary Footer */}
                          <div className="flex items-center gap-4 text-[11px] text-stone-500 pt-1 flex-wrap">
                            <span>Qty: <strong className="text-stone-800">{p.quantity}</strong></span>
                            <span>Making Charge: <strong className="text-stone-800">₹{p.making_charge || '650'}</strong></span>
                            <span>Wastage: <strong className="text-stone-800">{p.wastage_percent || '3.50'}%</strong></span>
                            {p.image_url && (
                              <span className="truncate max-w-xs flex items-center gap-1">
                                <i className="fa-regular fa-image text-emerald-600"></i>
                                Image: <a href={p.image_url} target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline font-mono text-[10px]">{p.image_url}</a>
                              </span>
                            )}
                            {p.description && (
                              <span className="truncate max-w-xs">Notes: <em>{p.description}</em></span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-stone-200 bg-stone-50/70 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-stone-500 font-medium">
                {errors.length > 0 ? (
                  <span className="text-rose-600 font-bold flex items-center gap-1.5">
                    <i className="fa-solid fa-triangle-exclamation"></i>
                    Please correct the {errors.length} validation blocker(s) above and reload the file.
                  </span>
                ) : (
                  <span>
                    Verified safe: <strong className="text-stone-900">{products.length}</strong> products &bull; <strong className="text-stone-900">{stats.total_components || 0}</strong> components
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="px-5 py-2.5 bg-white border border-stone-300 hover:border-stone-400 text-stone-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Close Preview
                </button>

                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={uploading || !previewData.is_valid || errors.length > 0 || products.length === 0}
                  className="px-6 py-2.5 bg-[#800000] hover:bg-[#680000] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                      <span>Committing Transaction...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-cloud-arrow-up text-xs"></i>
                      <span>Confirm &amp; Import ({products.length} Products)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
