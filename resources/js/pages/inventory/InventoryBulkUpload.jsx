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

  // Preview Modal State
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [parsedRows, setParsedRows] = useState([]);
  const [parseErrors, setParseErrors] = useState([]);
  const [rawTextContent, setRawTextContent] = useState('');

  // Sample CSV generator for download
  const downloadSampleCSV = () => {
    const headers = ['product_name', 'product_code', 'category', 'subcategory', 'gross_wt', 'net_wt', 'purity', 'quantity', 'making_charge', 'wastage'];
    const sampleRows = [
      ['Antique Gold Necklace 22K', 'RJ-GN-1001', 'Gold', 'Necklace', '45.50', '42.10', '22K (91.6%)', '1', '650', '3.50'],
      ['Diamond Solitaire Ring 18K', 'RJ-DR-2004', 'Diamond', 'Rings', '6.20', '5.80', '18K (75.0%)', '2', '1200', '4.00'],
      ['Heritage Temple Kada Bangle', 'RJ-GB-3012', 'Gold', 'Bangles', '32.00', '30.50', '22K (91.6%)', '1', '700', '3.80'],
      ['Silver Royal Payal Anklet', 'RJ-SP-4009', 'Silver', 'Anklets', '85.00', '84.00', '92.5 Sterling Silver', '5', '150', '2.00'],
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...sampleRows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'rudhra_inventory_bulk_sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Sample CSV format downloaded successfully', 'info');
  };

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    const name = selectedFile.name.toLowerCase();
    if (!name.endsWith('.csv') && !name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.txt')) {
      showToast('Please upload a valid CSV or Excel file (.csv, .xlsx, .txt)', 'error');
      return;
    }

    setFile(selectedFile);
    setFileInfo({
      name: selectedFile.name,
      size: (selectedFile.size / 1024).toFixed(1) + ' KB',
    });

    // Read file content for preview parsing
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      setRawTextContent(text);
    };
    reader.readAsText(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Parse CSV for Preview
  const parseCSVForPreview = (text) => {
    if (!text) return { rows: [], errors: ['File content is empty'] };
    const lines = text.split(/\r\n|\n/);
    if (lines.length === 0) return { rows: [], errors: ['No lines found in file'] };

    const parseLine = (line) => {
      const result = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          inQuotes = !inQuotes;
        } else if (c === ',' && !inQuotes) {
          result.push(cur.trim());
          cur = '';
        } else {
          cur += c;
        }
      }
      result.push(cur.trim());
      return result;
    };

    const rawHeaders = parseLine(lines[0]);
    const headers = rawHeaders.map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, '_'));

    const rows = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const rawLine = lines[i].trim();
      if (!rawLine) continue;
      const values = parseLine(rawLine);
      
      const rowObj = {};
      headers.forEach((h, idx) => {
        rowObj[h] = values[idx] || '';
      });

      const name = rowObj.product_name || rowObj.name || rowObj.title || rowObj.item_name;
      const code = rowObj.product_code || rowObj.sku || rowObj.code;
      const cat = rowObj.category || rowObj.category_name || rowObj.type;

      if (!name) {
        errors.push(`Row ${i + 1}: Missing Product Name`);
      } else {
        rows.push({
          rowIndex: i + 1,
          name: name,
          code: code || `RJ-BLK-${Math.floor(1000 + Math.random() * 9000)}-${i + 1}`,
          category: cat || 'Gold',
          gross_wt: rowObj.gross_wt || rowObj.gross_weight || rowObj.weight || '0.00',
          net_wt: rowObj.net_wt || rowObj.net_weight || rowObj.gross_wt || '0.00',
          purity: rowObj.purity || rowObj.gold_type || '22K',
          quantity: rowObj.quantity || rowObj.qty || rowObj.stock_qty || '1',
          making_charge: rowObj.making_charge || '650',
          wastage: rowObj.wastage || '3.50',
          isValid: true,
        });
      }
    }

    return { rows, errors };
  };

  // Open Preview Modal or trigger directly
  const handleUploadAndPreview = () => {
    if (!file) {
      fileInputRef.current?.click();
      return;
    }

    const { rows, errors } = parseCSVForPreview(rawTextContent);
    setParsedRows(rows);
    setParseErrors(errors);
    setShowPreviewModal(true);
  };

  // Final submission to API
  const handleConfirmImport = async () => {
    if (!file) return;
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/inventory/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      showToast(res.data.message || 'Inventory items imported successfully!', 'success', 'Import Complete');
      setShowPreviewModal(false);
      setTimeout(() => {
        navigate('/inventory');
      }, 1000);
    } catch (err) {
      console.error('Upload failed:', err);
      const data = err.response?.data;
      const errMsg = data?.message || 'Upload failed. Please verify format.';
      showToast(errMsg, 'error');
      if (data?.errors && Array.isArray(data.errors)) {
        setParseErrors(data.errors);
      }
    } finally {
      setUploading(false);
    }
  };

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
          
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight">
            Bulk Inventory Upload
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Upload CSV or Excel files to update your heritage collection in real-time.
          </p>
        </div>

        {/* Main Card Container */}
        <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-6 sm:p-10 space-y-8">
          
          {/* Drag & Drop File Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`bg-white rounded-2xl border transition-all cursor-pointer text-center flex flex-col items-center justify-center min-h-[250px] p-8 ${
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

            {/* Circular Red Cloud Upload Icon */}
            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-4 transition-transform group-hover:scale-105 ${
              fileInfo ? 'bg-emerald-100 text-emerald-700' : 'bg-[#fdf2f2] text-[#800000]'
            }`}>
              {fileInfo ? (
                <i className="fa-solid fa-[#800000] fa-file-csv text-2xl text-[#800000]"></i>
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
                  <span>File loaded & ready for validation preview</span>
                </p>
                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setFileInfo(null);
                      setRawTextContent('');
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
                  Drop your files here or click to browse
                </h2>
                <p className="text-xs sm:text-sm text-stone-400 mt-1">
                  Standardized inventory data format required
                </p>
              </>
            )}
          </div>

          {/* Subtle Horizontal Divider */}
          <hr className="border-t border-stone-200/70 my-6" />

          {/* Bottom Footer Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Left side info text */}
            <div className="flex items-center gap-2 text-stone-500 text-xs sm:text-sm font-medium">
              <div className="w-4 h-4 rounded-full border border-stone-400 flex items-center justify-center text-[10px] font-serif font-bold text-stone-600 shrink-0">
                i
              </div>
              <span>Files are validated instantly against our heritage standards.</span>
              <button
                type="button"
                onClick={downloadSampleCSV}
                className="ml-2 text-xs font-bold text-[#800000] hover:underline cursor-pointer flex items-center gap-1 shrink-0"
                title="Download CSV format sample"
              >
                <i className="fa-solid fa-download text-[10px]"></i>
                <span>Sample Template</span>
              </button>
            </div>

            {/* Right side Upload & Preview Button */}
            <button
              type="button"
              onClick={handleUploadAndPreview}
              disabled={uploading}
              className="w-full sm:w-auto px-7 py-3 bg-[#800000] hover:bg-[#680000] active:bg-[#520000] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-red-950/15 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                  <span>Processing...</span>
                </>
              ) : (
                <span>Upload &amp; Preview</span>
              )}
            </button>
          </div>

        </div>

      </div>

      {/* Interactive Preview & Validation Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#800000] text-white flex items-center justify-center text-sm font-bold shadow-xs">
                  <i className="fa-solid fa-file-invoice"></i>
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">
                    Inventory Upload Preview
                  </h3>
                  <p className="text-xs text-stone-500">
                    File: <span className="font-semibold text-stone-700">{fileInfo?.name}</span> ({parsedRows.length} items detected)
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

            {/* Validation Alerts */}
            {parseErrors.length > 0 && (
              <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start gap-2">
                <i className="fa-solid fa-triangle-exclamation text-amber-600 mt-0.5"></i>
                <div>
                  <span className="font-bold">Notice:</span> Some rows may require review.
                  <ul className="list-disc list-inside mt-1 text-[11px] text-amber-700">
                    {parseErrors.slice(0, 3).map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Modal Body Table */}
            <div className="p-6 overflow-y-auto flex-1 max-h-[55vh]">
              {parsedRows.length === 0 ? (
                <div className="py-12 text-center text-stone-400 text-sm font-medium">
                  No records parsed from the file. Please check file formatting.
                </div>
              ) : (
                <div className="border border-stone-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200">
                        <th className="py-3 px-3 w-10 text-center">#</th>
                        <th className="py-3 px-3">Product Name</th>
                        <th className="py-3 px-3">SKU / Code</th>
                        <th className="py-3 px-3">Category</th>
                        <th className="py-3 px-3 text-right">Gross Wt (g)</th>
                        <th className="py-3 px-3 text-right">Net Wt (g)</th>
                        <th className="py-3 px-3">Purity</th>
                        <th className="py-3 px-3 text-center">Qty</th>
                        <th className="py-3 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200/80 bg-white">
                      {parsedRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-stone-50/60 transition-colors">
                          <td className="py-2.5 px-3 text-center text-stone-400 font-mono text-[11px]">
                            {row.rowIndex}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-stone-900">
                            {row.name}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[#800000] font-bold text-[11px]">
                            {row.code}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 text-[10px] font-semibold border border-stone-200">
                              {row.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-stone-800">
                            {row.gross_wt}g
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-stone-800">
                            {row.net_wt}g
                          </td>
                          <td className="py-2.5 px-3 text-stone-700 font-medium">
                            {row.purity}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-stone-900">
                            {row.quantity}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                              Valid
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-stone-200 bg-stone-50/60 flex items-center justify-between">
              <div className="text-xs text-stone-500 font-medium">
                Ready to commit <strong className="text-stone-900">{parsedRows.length}</strong> items to Master Inventory
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="px-5 py-2.5 bg-white border border-stone-300 hover:border-stone-400 text-stone-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={uploading || parsedRows.length === 0}
                  className="px-6 py-2.5 bg-[#800000] hover:bg-[#680000] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                      <span>Importing...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-cloud-arrow-up text-xs"></i>
                      <span>Confirm &amp; Import ({parsedRows.length} Items)</span>
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

