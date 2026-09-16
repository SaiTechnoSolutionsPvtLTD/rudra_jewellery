import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function InventoryBulkUpload() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const fileInputRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState('gold');
  const [selectedCategoryObj, setSelectedCategoryObj] = useState(null);
  const [file, setFile] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);

  // Category definitions matching Image 1
  const categoryDefinitions = [
    {
      key: 'diamond',
      title: 'Diamond',
      icon: 'fa-regular fa-gem',
      description: 'Elegant designs crafted to perfection',
      matchTerms: ['diamond'],
    },
    {
      key: 'ornaments',
      title: 'Ornaments',
      icon: 'fa-solid fa-award',
      description: 'Luxury ornaments for every occasion',
      matchTerms: ['ornament', 'ornaments', 'jewellery'],
    },
    {
      key: 'gold',
      title: 'Gold',
      icon: 'fa-solid fa-coins',
      description: 'Premium gold for fine craftsmanship',
      matchTerms: ['gold', 'raw gold'],
    },
    {
      key: 'stone',
      title: 'Stone',
      icon: 'fa-solid fa-cube',
      description: 'Rare gemstones with lasting brilliance',
      matchTerms: ['stone', 'gem', 'gemstone'],
    },
    {
      key: 'silver',
      title: 'Silver',
      icon: 'fa-solid fa-ring',
      description: 'Quality silver for timeless creations',
      matchTerms: ['silver'],
    },
  ];

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/inventory/categories');
      const cats = res.data || [];
      setCategories(cats);

      // Check session
      const saved = sessionStorage.getItem('inventory_selected_category');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setSelectedCategoryObj(parsed);
          const matchedDef = categoryDefinitions.find((def) =>
            def.matchTerms.some((t) => (parsed.name || '').toLowerCase().includes(t))
          );
          if (matchedDef) {
            setSelectedCategoryKey(matchedDef.key);
            return;
          }
        } catch (e) {}
      }

      matchAndSetCategory('gold', cats);
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const matchAndSetCategory = (key, catList = categories) => {
    const def = categoryDefinitions.find((d) => d.key === key);
    if (!def) return;

    setSelectedCategoryKey(key);

    const matchedDbCat = catList.find((c) =>
      def.matchTerms.some(
        (t) => (c.name || '').toLowerCase().includes(t) || (c.code || '').toLowerCase().includes(t)
      )
    );

    if (matchedDbCat) {
      setSelectedCategoryObj(matchedDbCat);
      sessionStorage.setItem('inventory_selected_category', JSON.stringify(matchedDbCat));
    } else {
      const fallback = { id: key, name: def.title, code: key.toUpperCase() };
      setSelectedCategoryObj(fallback);
      sessionStorage.setItem('inventory_selected_category', JSON.stringify(fallback));
    }
  };

  const handleSelectCategory = (catDef) => {
    matchAndSetCategory(catDef.key);
  };

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    const name = selectedFile.name.toLowerCase();
    if (!name.endsWith('.csv') && !name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.txt')) {
      showToast('Please upload a valid CSV or Excel file', 'error');
      return;
    }
    setFile(selectedFile);
    setFileInfo({
      name: selectedFile.name,
      size: (selectedFile.size / 1024).toFixed(1) + ' KB',
    });
    setValidationErrors([]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleProcessUpload = async () => {
    if (file) {
      setUploading(true);
      setValidationErrors([]);

      const formData = new FormData();
      formData.append('file', file);
      if (selectedCategoryObj?.id) {
        formData.append('category_id', selectedCategoryObj.id);
      }

      try {
        const res = await api.post('/inventory/bulk-upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        showToast(res.data.message || 'File uploaded successfully!', 'success', 'Upload Complete');
        setTimeout(() => {
          navigate('/inventory');
        }, 1200);
      } catch (err) {
        console.error('Upload failed:', err);
        const data = err.response?.data;
        if (data?.errors && Array.isArray(data.errors)) {
          setValidationErrors(data.errors);
        } else {
          setValidationErrors([data?.message || 'Upload validation failed']);
        }
        showToast(data?.message || 'Upload failed', 'error');
      } finally {
        setUploading(false);
      }
      return;
    }

    if (selectedCategoryObj) {
      sessionStorage.setItem('inventory_selected_category', JSON.stringify(selectedCategoryObj));
      navigate('/inventory/add-new/subcategory');
      return;
    }

    showToast('Please select a category or choose a file to upload', 'warning');
  };

  return (
    <div className="w-full pb-16 space-y-6 font-['Inter',-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif] max-w-5xl mx-auto">
      
      {/* 1. Stepper Header (Exact match to Reference Image 1) */}
      <div className="flex items-center justify-center pt-2 pb-3">
        <div className="flex items-center gap-2 sm:gap-4">
          
          {/* Step 1: Upload File (Active) */}
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-[#b01622] text-white flex items-center justify-center text-xs font-bold shadow-2xs">
              1
            </div>
            <span className="text-xs font-semibold text-[#b01622] mt-1.5 whitespace-nowrap">Upload File</span>
          </div>

          <div className="w-16 sm:w-28 h-0.5 bg-stone-300 -mt-5"></div>

          {/* Step 2: Valid Data */}
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-white border border-stone-300 text-stone-600 flex items-center justify-center text-xs font-bold">
              2
            </div>
            <span className="text-xs font-semibold text-stone-600 mt-1.5 whitespace-nowrap">Valid Data</span>
          </div>

          <div className="w-16 sm:w-28 h-0.5 bg-stone-300 -mt-5"></div>

          {/* Step 3: Complete */}
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-white border border-stone-300 text-stone-600 flex items-center justify-center text-xs font-bold">
              3
            </div>
            <span className="text-xs font-semibold text-stone-600 mt-1.5 whitespace-nowrap">Complete</span>
          </div>

        </div>
      </div>

      {/* Validation Errors Banner if any */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 text-xs space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <i className="fa-solid fa-circle-exclamation"></i>
            <span>Validation Issues:</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-red-700">
            {validationErrors.slice(0, 5).map((err, i) => (
              <li key={i}>{typeof err === 'string' ? err : JSON.stringify(err)}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 2. Select Inventory Category Card (Exact match to Reference Image 1) */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-stone-200/80 shadow-2xs space-y-5">
        
        {/* Header with Red Box Icon */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#b01622] text-white flex items-center justify-center text-base shadow-2xs shrink-0">
            <i className="fa-solid fa-box-archive"></i>
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900 tracking-tight">Select Inventory Category</h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Choose the category you want to manage from below
            </p>
          </div>
        </div>

        {/* 5 Category Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          {categoryDefinitions.map((catDef) => {
            const isSelected = selectedCategoryKey === catDef.key;
            return (
              <div
                key={catDef.key}
                onClick={() => handleSelectCategory(catDef)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer text-center flex flex-col items-center justify-between min-h-[145px] ${
                  isSelected
                    ? 'border-[#b01622] bg-red-50/20 ring-2 ring-red-100 shadow-2xs scale-[1.01]'
                    : 'border-stone-200/80 hover:border-stone-300 hover:bg-stone-50/50'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-base mb-2 ${
                  catDef.key === 'gold' ? 'text-amber-600' :
                  catDef.key === 'silver' ? 'text-slate-600' : 'text-[#b01622]'
                }`}>
                  <i className={catDef.icon}></i>
                </div>

                <div>
                  <div className={`font-bold text-xs ${
                    isSelected ? 'text-[#b01622]' : 'text-stone-800'
                  }`}>
                    {catDef.title}
                  </div>
                  <p className="text-[10px] text-stone-400 leading-snug mt-1.5 px-1">
                    {catDef.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Drag and Drop File Upload Area (Exact match to Reference Image 1) */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`bg-white rounded-2xl p-10 sm:p-12 border transition-all shadow-2xs text-center flex flex-col items-center justify-center min-h-[220px] ${
          dragOver ? 'border-[#b01622] bg-red-50/20' : 'border-stone-200/80'
        }`}
      >
        <div className="w-12 h-12 rounded-full bg-stone-100/90 text-stone-700 flex items-center justify-center text-xl mb-3 shadow-2xs border border-stone-200/60">
          <i className="fa-solid fa-cloud-arrow-up"></i>
        </div>

        <h3 className="text-sm font-bold text-gray-900 tracking-tight">
          Drag and drop your CSV/Excel file here
        </h3>
        <p className="text-xs text-stone-400 mt-1">
          or click to browse your local storage
        </p>

        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFileSelect(e.target.files[0])}
          accept=".csv,.xlsx,.xls,.txt"
          className="hidden"
        />

        {fileInfo ? (
          <div className="mt-5 inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold shadow-2xs">
            <i className="fa-solid fa-file-csv text-emerald-600 text-sm"></i>
            <span>{fileInfo.name}</span>
            <span className="text-emerald-600 text-[11px] font-normal">({fileInfo.size})</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
                setFileInfo(null);
              }}
              className="text-stone-400 hover:text-red-600 ml-1.5 cursor-pointer"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-5 px-6 py-2.5 bg-[#b01622] hover:bg-[#8f1019] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Select File
          </button>
        )}
      </div>

      {/* 4. Action Buttons (Exact match to Reference Image 1) */}
      <div className="flex items-center justify-center gap-4 pt-2">
        <button
          type="button"
          onClick={() => navigate('/inventory')}
          className="px-7 py-2.5 bg-white border border-stone-300 hover:border-stone-400 text-stone-700 text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handleProcessUpload}
          disabled={uploading}
          className="px-7 py-2.5 bg-[#b01622] hover:bg-[#8f1019] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {uploading ? (
            <>
              <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
              <span>Processing...</span>
            </>
          ) : (
            <span>Process Upload</span>
          )}
        </button>
      </div>

    </div>
  );
}
