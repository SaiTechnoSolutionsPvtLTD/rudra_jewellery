import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function InventoryAddNewCategory() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [categories, setCategories] = useState([]);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState('gold');
  const [selectedCategoryObj, setSelectedCategoryObj] = useState({
    id: 'gold',
    name: 'Gold',
    code: 'GOLD',
  });

  // Category definitions matching Figma requested items & exact order: Ornaments, Diamond, Gold, Stone, Silver
  const categoryDefinitions = [
    {
      key: 'ornaments',
      title: 'Ornaments',
      icon: 'fa-solid fa-gem',
      description: 'Luxury ornaments for every occasion',
      matchTerms: ['ornament', 'ornaments', 'jewellery'],
      badgeBg: 'bg-[#fce8e8]',
      iconColor: 'text-[#b01622]',
    },
    {
      key: 'diamond',
      title: 'Diamond',
      icon: 'fa-solid fa-certificate',
      description: 'Elegant designs crafted to perfection',
      matchTerms: ['diamond'],
      badgeBg: 'bg-[#fce8e8]',
      iconColor: 'text-[#b01622]',
    },
    {
      key: 'gold',
      title: 'Gold',
      icon: 'fa-solid fa-[#d4af37]',
      customSvg: (
        <svg className="w-5 h-5 text-[#b8860b]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 6h16v3H4zM2 11h20v3H2zM4 16h16v3H4z" />
        </svg>
      ),
      description: 'Premium gold for fine craftsmanship',
      matchTerms: ['gold', 'raw gold'],
      badgeBg: 'bg-[#fef3c7]',
      iconColor: 'text-[#d4af37]',
    },
    {
      key: 'stone',
      title: 'Stone',
      icon: 'fa-solid fa-cube',
      description: 'Rare gemstones with lasting brilliance',
      matchTerms: ['stone', 'gem', 'gemstone'],
      badgeBg: 'bg-[#fce8e8]',
      iconColor: 'text-[#b01622]',
    },
    {
      key: 'silver',
      title: 'Silver',
      icon: 'fa-solid fa-circle-notch',
      customSvg: (
        <svg className="w-5 h-5 text-[#c5a059]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <ellipse cx="12" cy="12" rx="8" ry="4" />
        </svg>
      ),
      description: 'Quality silver for timeless creations',
      matchTerms: ['silver'],
      badgeBg: 'bg-[#fef3c7]',
      iconColor: 'text-[#c5a059]',
    },
  ];

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/inventory/categories');
      const cats = Array.isArray(res.data)
        ? res.data
        : res.data?.categories || res.data?.data || [];
      setCategories(cats);

      // Check session
      const saved = sessionStorage.getItem('inventory_selected_category');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && (parsed.id || parsed.name)) {
            setSelectedCategoryObj(parsed);
            const matchedDef = categoryDefinitions.find((def) =>
              def.matchTerms.some((t) => (parsed.name || '').toLowerCase().includes(t))
            );
            if (matchedDef) {
              setSelectedCategoryKey(matchedDef.key);
              return;
            }
          }
        } catch (e) {}
      }

      // Default to Gold or first matching
      matchAndSetCategory('gold', cats);
    } catch (err) {
      console.error('Failed to load categories', err);
      matchAndSetCategory('gold', []);
    }
  };

  const matchAndSetCategory = (key, catList = categories) => {
    const def = categoryDefinitions.find((d) => d.key === key);
    if (!def) return;

    setSelectedCategoryKey(key);

    const safeList = Array.isArray(catList) ? catList : [];
    const matchedDbCat = safeList.find((c) =>
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

  const handleProcessUpload = () => {
    const currentDef = categoryDefinitions.find((d) => d.key === selectedCategoryKey) || categoryDefinitions[2];
    const categoryToSave = selectedCategoryObj || {
      id: currentDef.key,
      name: currentDef.title,
      code: currentDef.key.toUpperCase(),
    };

    sessionStorage.setItem('inventory_selected_category', JSON.stringify(categoryToSave));
    navigate('/inventory/add-new/subcategory');
  };

  return (
    <div className="w-full pb-16 space-y-6 font-['Inter',-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif] max-w-5xl mx-auto">
      
      {/* 1. Stepper Header (Matching Figma Image 2) */}
      <div className="flex items-center justify-center pt-2 pb-2">
        <div className="flex items-center gap-2 sm:gap-6">
          
          {/* Step 1: Upload File (Active Red Circle) */}
          <div className="flex flex-col items-center">
            <div className="w-9 h-9 rounded-full bg-[#b01622] text-white flex items-center justify-center text-xs font-bold shadow-xs">
              1
            </div>
            <span className="text-xs font-semibold text-[#b01622] mt-1.5 whitespace-nowrap">Upload File</span>
          </div>

          <div className="w-16 sm:w-28 h-[1.5px] bg-stone-200 -mt-5"></div>

          {/* Step 2: Valid Data */}
          <div className="flex flex-col items-center">
            <div className="w-9 h-9 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center text-xs font-bold border border-stone-200/80">
              2
            </div>
            <span className="text-xs font-semibold text-stone-600 mt-1.5 whitespace-nowrap">Valid Data</span>
          </div>

          <div className="w-16 sm:w-28 h-[1.5px] bg-stone-200 -mt-5"></div>

          {/* Step 3: Complete */}
          <div className="flex flex-col items-center">
            <div className="w-9 h-9 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center text-xs font-bold border border-stone-200/80">
              3
            </div>
            <span className="text-xs font-semibold text-stone-600 mt-1.5 whitespace-nowrap">Complete</span>
          </div>

        </div>
      </div>

      {/* 2. Select Inventory Category Card (Matching Figma Image 2) */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-stone-200/80 shadow-2xs space-y-6">
        
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

        {/* 5 Category Cards Grid (Exact match to Image 1) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 pt-1">
          {categoryDefinitions.map((catDef) => {
            const isSelected = selectedCategoryKey === catDef.key;
            return (
              <div
                key={catDef.key}
                onClick={() => handleSelectCategory(catDef)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer text-center flex flex-col items-center justify-between min-h-[170px] ${
                  isSelected
                    ? 'bg-[#fff0f2] border-[#b01622] ring-2 ring-red-100/80 shadow-xs scale-[1.02]'
                    : 'bg-[#fff7f8] hover:bg-[#fff0f2] border-stone-200/60 hover:border-rose-200 shadow-2xs'
                }`}
              >
                {/* Circular Icon Badge */}
                <div className={`w-12 h-12 rounded-full ${catDef.badgeBg} flex items-center justify-center text-base mb-2 shrink-0 shadow-2xs transition-transform ${
                  isSelected ? 'scale-105' : ''
                }`}>
                  {catDef.customSvg ? (
                    catDef.customSvg
                  ) : (
                    <i className={`${catDef.icon} ${catDef.iconColor}`}></i>
                  )}
                </div>

                <div className="flex flex-col items-center w-full">
                  {/* Category Title (Crimson Red Text matching Image 1) */}
                  <div className="font-bold text-xs sm:text-sm text-[#8b131b]">
                    {catDef.title}
                  </div>

                  {/* Gold/Bronze Underline Accent Bar (Matching Image 1) */}
                  <div className="w-8 h-[2.5px] bg-[#c5a059] my-2 rounded-full opacity-90"></div>

                  {/* Description (Dark grey text matching Image 1) */}
                  <p className="text-[11px] text-stone-700 font-medium leading-tight px-1 text-center">
                    {catDef.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Action Buttons */}
      <div className="flex items-center justify-center gap-4 pt-4">
        <button
          type="button"
          onClick={() => navigate('/inventory')}
          className="px-8 py-2.5 bg-white border border-stone-300 hover:border-stone-400 text-stone-700 text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handleProcessUpload}
          className="px-8 py-2.5 bg-[#b01622] hover:bg-[#8f1019] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
        >
          <span>Process Upload</span>
        </button>
      </div>

    </div>
  );
}
