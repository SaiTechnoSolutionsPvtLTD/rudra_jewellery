import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function InventoryAddNewSubcategory() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  // 5 Top Categories matching Figma reference design & order: Ornaments, Diamond, Gold, Stone, Silver
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

  // Dynamic golden jewelry icon mapper based on subcategory name (Matching Figma Image 2)
  const getSubcategoryIcon = (name = '') => {
    const n = name.toLowerCase();
    if (n.includes('ring') || n.includes('solitaire')) {
      return (
        <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-[#c5a059] shrink-0 border border-amber-100">
          <i className="fa-solid fa-ring text-sm"></i>
        </div>
      );
    }
    if (n.includes('neck') || n.includes('choker') || n.includes('haram')) {
      return (
        <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-[#c5a059] shrink-0 border border-amber-100">
          <i className="fa-solid fa-gem text-xs"></i>
        </div>
      );
    }
    if (n.includes('chain') || n.includes('mangalsutra')) {
      return (
        <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-[#c5a059] shrink-0 border border-amber-100">
          <i className="fa-solid fa-link text-xs"></i>
        </div>
      );
    }
    if (n.includes('bangle') || n.includes('kada')) {
      return (
        <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-[#c5a059] shrink-0 border border-amber-100">
          <i className="fa-solid fa-circle-notch text-sm"></i>
        </div>
      );
    }
    if (n.includes('bracelet')) {
      return (
        <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-[#c5a059] shrink-0 border border-amber-100">
          <i className="fa-solid fa-circle-nodes text-xs"></i>
        </div>
      );
    }
    if (n.includes('ear') || n.includes('stud') || n.includes('jhumka')) {
      return (
        <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-[#c5a059] shrink-0 border border-amber-100">
          <i className="fa-solid fa-award text-xs"></i>
        </div>
      );
    }
    if (n.includes('pendant') || n.includes('locket')) {
      return (
        <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-[#c5a059] shrink-0 border border-amber-100">
          <i className="fa-solid fa-shield-halved text-xs"></i>
        </div>
      );
    }
    if (n.includes('nose')) {
      return (
        <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-[#c5a059] shrink-0 border border-amber-100">
          <i className="fa-solid fa-sparkles text-xs"></i>
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-[#c5a059] shrink-0 border border-amber-100">
        <i className="fa-solid fa-award text-xs"></i>
      </div>
    );
  };

  // Read session immediately so category cards render synchronously
  const getInitialCategoryKey = () => {
    try {
      const saved = sessionStorage.getItem('inventory_selected_category');
      if (saved) {
        const parsed = JSON.parse(saved);
        const defs = [
          { key: 'ornaments', matchTerms: ['ornament', 'ornaments', 'jewellery'] },
          { key: 'diamond',   matchTerms: ['diamond'] },
          { key: 'gold',      matchTerms: ['gold', 'raw gold'] },
          { key: 'stone',     matchTerms: ['stone', 'gem', 'gemstone'] },
          { key: 'silver',    matchTerms: ['silver'] },
        ];
        const matched = defs.find((def) =>
          def.matchTerms.some(
            (t) =>
              (parsed.name || '').toLowerCase().includes(t) ||
              (parsed.code || '').toLowerCase().includes(t)
          )
        );
        return matched?.key || 'diamond';
      }
    } catch (e) {}
    return 'diamond';
  };

  const [categories, setCategories] = useState([]);
  const [allMasterSubcategories, setAllMasterSubcategories] = useState([]);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState(() => getInitialCategoryKey());
  const [selectedCategoryObj, setSelectedCategoryObj] = useState(() => {
    try {
      const saved = sessionStorage.getItem('inventory_selected_category');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [subcategories, setSubcategories] = useState([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCategoryLocked, setIsCategoryLocked] = useState(
    () => !!sessionStorage.getItem('inventory_selected_category')
  );

  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      setLoading(true);
      const [catRes, subRes] = await Promise.all([
        api.get('/inventory/categories'),
        api.get('/subcategories'),
      ]);

      const cats = catRes.data || [];
      const masterSubs = subRes.data || [];
      setCategories(cats);
      setAllMasterSubcategories(masterSubs);

      const savedCat = sessionStorage.getItem('inventory_selected_category');
      let initialKey = selectedCategoryKey || 'diamond';
      let activeCatObj = selectedCategoryObj;

      if (savedCat) {
        try {
          const parsed = JSON.parse(savedCat);
          activeCatObj = parsed;
          const matchedDef = categoryDefinitions.find((def) =>
            def.matchTerms.some((t) => (parsed.name || '').toLowerCase().includes(t) || (parsed.code || '').toLowerCase().includes(t))
          );
          if (matchedDef) initialKey = matchedDef.key;
        } catch (e) {}
      }

      filterSubcategoriesForCategory(initialKey, cats, masterSubs, activeCatObj);
    } catch (err) {
      console.error('Failed to load master subcategories', err);
      showToast('Failed to load master categories and subcategories', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filterSubcategoriesForCategory = (catKey, allCats = categories, masterSubs = allMasterSubcategories, specificObj = null) => {
    const def = categoryDefinitions.find((d) => d.key === catKey);
    const dbCat = specificObj || allCats.find((c) =>
      def?.matchTerms.some(
        (t) => (c.name || '').toLowerCase().includes(t) || (c.code || '').toLowerCase().includes(t)
      )
    );

    const catObj = dbCat || { id: catKey, name: def?.title || 'Diamond', code: catKey.toUpperCase() };
    setSelectedCategoryObj(catObj);
    sessionStorage.setItem('inventory_selected_category', JSON.stringify(catObj));

    const directSubs = catObj.subcategories || [];
    const masterMatchingSubs = masterSubs.filter((s) => {
      if (catObj.id && s.category_id === catObj.id) return true;
      if (catObj.code && s.category?.code === catObj.code) return true;
      if (catObj.name && s.category?.name && s.category.name.toLowerCase() === catObj.name.toLowerCase()) return true;
      return false;
    });

    const mergedMap = new Map();
    [...directSubs, ...masterMatchingSubs].forEach((sub) => {
      if (sub && sub.id) {
        mergedMap.set(sub.id, sub);
      }
    });

    const filtered = Array.from(mergedMap.values());
    setSubcategories(filtered);

    const savedSub = sessionStorage.getItem('inventory_selected_subcategory');
    if (savedSub) {
      try {
        const parsedSub = JSON.parse(savedSub);
        const match = filtered.find((s) => s.id === parsedSub.id || s.name?.toLowerCase() === parsedSub.name?.toLowerCase());
        if (match) {
          setSelectedSubcategory(match);
          return;
        }
      } catch (e) {}
    }

    if (filtered.length > 0) {
      setSelectedSubcategory(filtered[0]);
    } else {
      setSelectedSubcategory(null);
    }
  };

  const handleSelectCategory = (catDef) => {
    if (isCategoryLocked) return;
    setSelectedCategoryKey(catDef.key);
    filterSubcategoriesForCategory(catDef.key);
  };

  const handleSelectSubcategory = (sub) => {
    setSelectedSubcategory(sub);
  };

  const handleProcessUpload = () => {
    if (!selectedSubcategory) {
      showToast('Please select a subcategory to proceed', 'warning');
      return;
    }

    sessionStorage.setItem('inventory_selected_category', JSON.stringify(selectedCategoryObj));
    sessionStorage.setItem('inventory_selected_subcategory', JSON.stringify(selectedSubcategory));
    navigate('/inventory/add-new/upload');
  };

  const currentCategoryTitle = categoryDefinitions.find((d) => d.key === selectedCategoryKey)?.title || selectedCategoryObj?.name || 'Diamonds';

  return (
    <div className="w-full pb-16 space-y-6 font-['Inter',-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif] max-w-5xl mx-auto">
      
      {/* 1. Stepper Header (Matching Figma Image 2) */}
      <div className="flex items-center justify-center pt-2 pb-2">
        <div className="flex items-center gap-2 sm:gap-6">
          
          {/* Step 1: Upload File */}
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

      {/* 2. Card 1: Select Inventory Category (Matching Figma Image 2) */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-stone-200/80 shadow-2xs space-y-6">
        
        {/* Header with Red Box Icon */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#b01622] text-white flex items-center justify-center text-base shadow-2xs shrink-0">
              <i className="fa-solid fa-box-archive"></i>
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 tracking-tight">Select Inventory Category</h2>
              <p className="text-xs text-stone-400 mt-0.5">
                {isCategoryLocked
                  ? 'Category is locked. Go back to change it.'
                  : 'Choose the category you want to manage from below'}
              </p>
            </div>
          </div>
          {isCategoryLocked && (
            <Link
              to="/inventory/add-new/category"
              className="text-xs font-bold text-stone-500 hover:text-[#b01622] flex items-center gap-1.5 transition-colors border border-stone-200/80 px-3 py-1.5 rounded-lg bg-white shadow-2xs"
            >
              <i className="fa-solid fa-arrow-left text-[10px]"></i>
              <span>Change Category</span>
            </Link>
          )}
        </div>

        {/* 5 Category Cards Grid (Exact match to Image 1) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 pt-1">
          {categoryDefinitions.map((catDef) => {
            const isSelected = selectedCategoryKey === catDef.key;
            return (
              <div
                key={catDef.key}
                onClick={() => handleSelectCategory(catDef)}
                className={`p-4 rounded-2xl border transition-all text-center flex flex-col items-center justify-between min-h-[170px] relative ${
                  isCategoryLocked
                    ? isSelected
                      ? 'bg-[#fff0f2] border-[#b01622] ring-2 ring-red-100/80 shadow-xs cursor-not-allowed'
                      : 'bg-[#fff7f8]/70 border-stone-200/60 opacity-60 cursor-not-allowed'
                    : isSelected
                    ? 'bg-[#fff0f2] border-[#b01622] ring-2 ring-red-100/80 shadow-xs scale-[1.02] cursor-pointer'
                    : 'bg-[#fff7f8] hover:bg-[#fff0f2] border-stone-200/60 hover:border-rose-200 shadow-2xs cursor-pointer'
                }`}
              >
                {/* Lock indicator badge */}
                {isCategoryLocked && isSelected && (
                  <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[#b01622] text-white flex items-center justify-center text-[9px] shadow-2xs">
                    <i className="fa-solid fa-lock"></i>
                  </span>
                )}

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

      {/* 3. Card 2: Subcategory Selection Card Container (Exact soft blush bg-[#faf3f4] matching Image 2) */}
      <div className="bg-[#faf3f4] rounded-2xl p-6 sm:p-8 border border-stone-200/60 shadow-2xs space-y-6">
        
        {/* Header with Red Outline Icon */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-[#b01622] text-[#b01622] bg-white flex items-center justify-center text-base shadow-2xs shrink-0">
              <i className="fa-solid fa-gem"></i>
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 tracking-tight">
                {currentCategoryTitle}
              </h2>
              <p className="text-xs text-stone-500 mt-0.5 font-medium">
                Select a {currentCategoryTitle.toLowerCase()} type to manage inventory
              </p>
            </div>
          </div>

          <Link
            to="/masters/subcategories"
            className="text-xs font-bold text-[#b01622] hover:text-[#8f1019] hover:underline flex items-center gap-1.5 transition-colors"
          >
            <i className="fa-solid fa-gear text-[11px]"></i>
            <span>Manage Masters</span>
          </Link>
        </div>

        {/* Dynamic Subcategories Grid (Matching Image 2 pure white cards) */}
        {loading ? (
          <div className="py-12 text-center text-stone-400 text-xs">
            <i className="fa-solid fa-circle-notch fa-spin text-xl text-[#b01622] mr-2"></i>
            Loading subcategories...
          </div>
        ) : subcategories.length === 0 ? (
          <div className="py-10 text-center border-2 border-dashed border-stone-200 rounded-2xl p-6 space-y-3 bg-white">
            <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center text-xl mx-auto">
              <i className="fa-solid fa-folder-open"></i>
            </div>
            <div>
              <p className="text-xs font-bold text-stone-700">No subcategories found for {currentCategoryTitle}</p>
              <p className="text-[11px] text-stone-400 mt-0.5 max-w-sm mx-auto">
                Subcategories added in Masters will automatically appear here.
              </p>
            </div>
            <Link
              to="/masters/subcategories"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#b01622] hover:bg-[#8f1019] text-white text-xs font-bold rounded-xl shadow-2xs transition-colors"
            >
              <i className="fa-solid fa-plus text-xs"></i>
              <span>Add Subcategory in Masters</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-1">
            {subcategories.map((sub) => {
              const isSelected = selectedSubcategory?.id === sub.id;

              return (
                <div
                  key={sub.id}
                  onClick={() => handleSelectSubcategory(sub)}
                  className={`p-3.5 px-4 rounded-xl border transition-all cursor-pointer flex items-center gap-3.5 shadow-2xs ${
                    isSelected
                      ? 'bg-white border-[#b01622] ring-2 ring-red-100/80 scale-[1.02]'
                      : 'bg-white border-stone-100 hover:border-stone-300'
                  }`}
                >
                  {/* Left Golden Jewelry Icon */}
                  {getSubcategoryIcon(sub.name)}

                  <div className="min-w-0 flex-1">
                    <span className={`text-xs font-bold block truncate ${
                      isSelected ? 'text-[#b01622]' : 'text-gray-900'
                    }`}>
                      {sub.name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* 4. Action Buttons */}
      <div className="flex items-center justify-center gap-4 pt-3">
        <button
          type="button"
          onClick={() => navigate('/inventory/add-new/category')}
          className="px-6 py-2.5 bg-white border border-stone-300 hover:border-stone-400 text-stone-700 text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer flex items-center gap-2"
        >
          <i className="fa-solid fa-arrow-left text-xs"></i>
          <span>Back</span>
        </button>

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
          disabled={!selectedSubcategory}
          className="px-8 py-2.5 bg-[#b01622] hover:bg-[#8f1019] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <span>Process Upload</span>
        </button>
      </div>

    </div>
  );
}
