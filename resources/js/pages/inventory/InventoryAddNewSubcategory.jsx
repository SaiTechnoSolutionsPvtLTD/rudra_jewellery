import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function InventoryAddNewSubcategory() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const categoryScrollRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Dynamic golden jewelry icon mapper based on subcategory name
  const getSubcategoryIcon = (name = '') => {
    const n = name.toLowerCase();
    if (n.includes('ring') || n.includes('solitaire') || n.includes('band')) {
      return (
        <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-[#c5a059] shrink-0 border border-amber-100">
          <i className="fa-solid fa-ring text-sm"></i>
        </div>
      );
    }
    if (n.includes('neck') || n.includes('choker') || n.includes('haram') || n.includes('set')) {
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
    return (
      <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-[#c5a059] shrink-0 border border-amber-100">
        <i className="fa-solid fa-sparkles text-xs"></i>
      </div>
    );
  };

  // Dynamic visual styling helper for category cards
  const getCategoryMeta = (cat) => {
    const name = String(cat.name || '').toLowerCase();
    const code = String(cat.code || '').toLowerCase();

    if (name.includes('gold') || code.includes('gold')) {
      return {
        badgeBg: 'bg-[#fef3c7]',
        iconColor: 'text-[#d4af37]',
        defaultDesc: 'Premium gold for fine craftsmanship',
        customSvg: (
          <svg className="w-5 h-5 text-[#b8860b]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 6h16v3H4zM2 11h20v3H2zM4 16h16v3H4z" />
          </svg>
        ),
      };
    }

    if (name.includes('diamond') || code.includes('dia')) {
      return {
        badgeBg: 'bg-[#fce8e8]',
        iconColor: 'text-[#b01622]',
        icon: 'fa-solid fa-certificate',
        defaultDesc: 'Elegant designs crafted to perfection',
      };
    }

    if (name.includes('silver') || code.includes('slv')) {
      return {
        badgeBg: 'bg-[#fef3c7]',
        iconColor: 'text-[#c5a059]',
        defaultDesc: 'Quality silver for timeless creations',
        customSvg: (
          <svg className="w-5 h-5 text-[#c5a059]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <ellipse cx="12" cy="12" rx="8" ry="4" />
          </svg>
        ),
      };
    }

    if (name.includes('stone') || name.includes('gem') || code.includes('stn')) {
      return {
        badgeBg: 'bg-[#fce8e8]',
        iconColor: 'text-[#b01622]',
        icon: 'fa-solid fa-cube',
        defaultDesc: 'Rare gemstones with lasting brilliance',
      };
    }

    if (name.includes('ornament') || code.includes('orn')) {
      return {
        badgeBg: 'bg-[#fce8e8]',
        iconColor: 'text-[#b01622]',
        icon: 'fa-solid fa-gem',
        defaultDesc: 'Luxury ornaments for every occasion',
      };
    }

    if (name.includes('plat') || code.includes('plt')) {
      return {
        badgeBg: 'bg-[#eff6ff]',
        iconColor: 'text-[#3b82f6]',
        icon: 'fa-solid fa-award',
        defaultDesc: 'Pure platinum for contemporary luxury',
      };
    }

    return {
      badgeBg: 'bg-[#fdf2f8]',
      iconColor: 'text-[#b01622]',
      icon: 'fa-solid fa-crown',
      defaultDesc: 'Finest quality handcrafted jewelry collection',
    };
  };

  const updateScrollButtons = () => {
    const el = categoryScrollRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth + 5;
    setCanScrollLeft(el.scrollLeft > 5);
    setCanScrollRight(hasOverflow && el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
  };

  useEffect(() => {
    const el = categoryScrollRef.current;
    if (el) {
      updateScrollButtons();
      el.addEventListener('scroll', updateScrollButtons);
      window.addEventListener('resize', updateScrollButtons);
      return () => {
        el.removeEventListener('scroll', updateScrollButtons);
        window.removeEventListener('resize', updateScrollButtons);
      };
    }
  }, [categories]);

  const scroll = (direction) => {
    const el = categoryScrollRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.8;
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/inventory/categories');
      const cats = Array.isArray(res.data)
        ? res.data
        : res.data?.categories || res.data?.data || [];

      const activeCats = cats.filter((c) => c.status === 'active');
      setCategories(activeCats);

      // Determine active category from session
      let activeCat = null;
      const savedCat = sessionStorage.getItem('inventory_selected_category');
      if (savedCat) {
        try {
          const parsed = JSON.parse(savedCat);
          if (parsed && parsed.id) {
            activeCat = activeCats.find((c) => c.id === parsed.id || String(c.id) === String(parsed.id));
          }
        } catch (e) {}
      }

      if (!activeCat && activeCats.length > 0) {
        activeCat = activeCats.find((c) => (c.name || '').toLowerCase() === 'gold') || activeCats[0];
      }

      if (activeCat) {
        setSelectedCategory(activeCat);
        sessionStorage.setItem('inventory_selected_category', JSON.stringify(activeCat));
        loadSubcategoriesForCategory(activeCat);
      } else {
        setSubcategories([]);
        setSelectedSubcategory(null);
      }
    } catch (err) {
      console.error('Failed to load categories', err);
      showToast('Failed to load master categories and subcategories', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadSubcategoriesForCategory = (cat) => {
    const subs = (cat.subcategories || []).filter((s) => s.status === 'active');
    setSubcategories(subs);

    // Check if previously saved subcategory belongs to this category
    const savedSub = sessionStorage.getItem('inventory_selected_subcategory');
    let matchedSub = null;
    if (savedSub) {
      try {
        const parsedSub = JSON.parse(savedSub);
        if (parsedSub && parsedSub.id) {
          matchedSub = subs.find((s) => s.id === parsedSub.id && s.category_id === cat.id);
        }
      } catch (e) {}
    }

    if (matchedSub) {
      setSelectedSubcategory(matchedSub);
    } else if (subs.length > 0) {
      setSelectedSubcategory(subs[0]);
      sessionStorage.setItem('inventory_selected_subcategory', JSON.stringify(subs[0]));
    } else {
      setSelectedSubcategory(null);
      sessionStorage.removeItem('inventory_selected_subcategory');
    }
  };

  // Category switching on the Subcategory page (Unlocked and dynamic)
  const handleSelectCategory = (cat) => {
    if (selectedCategory?.id === cat.id) return;

    setSelectedCategory(cat);
    sessionStorage.setItem('inventory_selected_category', JSON.stringify(cat));

    // Clear previous subcategory since category switched
    sessionStorage.removeItem('inventory_selected_subcategory');
    loadSubcategoriesForCategory(cat);
    showToast(`Switched to category "${cat.name}"`, 'info');
  };

  const handleSelectSubcategory = (sub) => {
    setSelectedSubcategory(sub);
    sessionStorage.setItem('inventory_selected_subcategory', JSON.stringify(sub));
  };

  const handleProcessUpload = () => {
    if (!selectedCategory) {
      showToast('Please select a category', 'warning');
      return;
    }
    if (!selectedSubcategory) {
      showToast('Please select a subcategory to proceed', 'warning');
      return;
    }

    sessionStorage.setItem('inventory_selected_category', JSON.stringify(selectedCategory));
    sessionStorage.setItem('inventory_selected_subcategory', JSON.stringify(selectedSubcategory));
    navigate('/inventory/add-new/upload');
  };

  const currentCategoryTitle = selectedCategory?.name || 'Selected Category';

  return (
    <div className="w-full pb-16 space-y-6 font-['Inter',-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif] max-w-5xl mx-auto">
      
      {/* 1. Stepper Header */}
      <div className="flex items-center justify-center pt-2 pb-2">
        <div className="flex items-center gap-2 sm:gap-6">
          
          {/* Step 1: Upload File (Complete Red Circle) */}
          <div className="flex flex-col items-center">
            <div className="w-9 h-9 rounded-full bg-[#b01622] text-white flex items-center justify-center text-xs font-bold shadow-xs">
              <i className="fa-solid fa-check text-[11px]"></i>
            </div>
            <span className="text-xs font-semibold text-[#b01622] mt-1.5 whitespace-nowrap">Upload File</span>
          </div>

          <div className="w-16 sm:w-28 h-[1.5px] bg-[#b01622] -mt-5"></div>

          {/* Step 2: Valid Data (Active Red Circle) */}
          <div className="flex flex-col items-center">
            <div className="w-9 h-9 rounded-full bg-[#b01622] text-white flex items-center justify-center text-xs font-bold shadow-xs">
              2
            </div>
            <span className="text-xs font-semibold text-[#b01622] mt-1.5 whitespace-nowrap">Valid Data</span>
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

      {/* 2. Card 1: Select Inventory Category (Interactive & Switchable) */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-stone-200/80 shadow-2xs space-y-6">
        
        {/* Header with Red Box Icon and scroll arrows if > 5 categories */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#b01622] text-white flex items-center justify-center text-base shadow-2xs shrink-0">
              <i className="fa-solid fa-box-archive"></i>
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 tracking-tight">Select Inventory Category</h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Click any category below to switch and reload corresponding subcategories
              </p>
            </div>
          </div>

          {/* Scroll Navigation Arrows when categories > 5 */}
          {categories.length > 5 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => scroll('left')}
                disabled={!canScrollLeft}
                aria-label="Scroll left"
                className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs transition-all cursor-pointer ${
                  canScrollLeft
                    ? 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50 hover:border-[#b01622] hover:text-[#b01622] shadow-2xs'
                    : 'border-stone-200 bg-stone-100/60 text-stone-300 cursor-not-allowed'
                }`}
              >
                <i className="fa-solid fa-chevron-left"></i>
              </button>
              <button
                type="button"
                onClick={() => scroll('right')}
                disabled={!canScrollRight}
                aria-label="Scroll right"
                className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs transition-all cursor-pointer ${
                  canScrollRight
                    ? 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50 hover:border-[#b01622] hover:text-[#b01622] shadow-2xs'
                    : 'border-stone-200 bg-stone-100/60 text-stone-300 cursor-not-allowed'
                }`}
              >
                <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          )}
        </div>

        {/* Categories Viewport (Exactly 5 items visible per view + scrollable if > 5) */}
        <div className="relative">
          <div
            ref={categoryScrollRef}
            className={`pt-1 pb-2 flex gap-3.5 overflow-x-auto scroll-smooth no-scrollbar ${
              categories.length <= 5 ? 'sm:grid sm:grid-cols-5' : ''
            }`}
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {categories.map((cat) => {
              const isSelected = selectedCategory?.id === cat.id;
              const meta = getCategoryMeta(cat);
              const desc = cat.description || meta.defaultDesc;

              return (
                <div
                  key={cat.id}
                  onClick={() => handleSelectCategory(cat)}
                  className={`p-4 rounded-2xl border transition-all text-center flex flex-col items-center justify-between min-h-[170px] cursor-pointer ${
                    categories.length > 5
                      ? 'min-w-[calc((100%-4*14px)/5)] max-w-[calc((100%-4*14px)/5)] shrink-0'
                      : 'w-full'
                  } ${
                    isSelected
                      ? 'bg-[#fff0f2] border-[#b01622] ring-2 ring-red-100/80 shadow-xs scale-[1.02]'
                      : 'bg-[#fff7f8] hover:bg-[#fff0f2] border-stone-200/60 hover:border-rose-200 shadow-2xs'
                  }`}
                >
                  {/* Circular Icon Badge */}
                  <div
                    className={`w-12 h-12 rounded-full ${meta.badgeBg} flex items-center justify-center text-base mb-2 shrink-0 shadow-2xs transition-transform ${
                      isSelected ? 'scale-105' : ''
                    }`}
                  >
                    {meta.customSvg ? (
                      meta.customSvg
                    ) : (
                      <i className={`${meta.icon} ${meta.iconColor}`}></i>
                    )}
                  </div>

                  <div className="flex flex-col items-center w-full">
                    <div className="font-bold text-xs sm:text-sm text-[#8b131b] truncate max-w-full">
                      {cat.name}
                    </div>

                    <div className="w-8 h-[2.5px] bg-[#c5a059] my-2 rounded-full opacity-90"></div>

                    <p className="text-[11px] text-stone-700 font-medium leading-tight px-1 text-center line-clamp-2">
                      {desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Card 2: Subcategory Selection Card Container */}
      <div className="bg-[#faf3f4] rounded-2xl p-6 sm:p-8 border border-stone-200/60 shadow-2xs space-y-6">
        
        {/* Header with Red Outline Icon */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-[#b01622] text-[#b01622] bg-white flex items-center justify-center text-base shadow-2xs shrink-0">
              <i className="fa-solid fa-gem"></i>
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 tracking-tight">
                {currentCategoryTitle} Subcategories
              </h2>
              <p className="text-xs text-stone-500 mt-0.5 font-medium">
                Select a subcategory type for {currentCategoryTitle.toLowerCase()}
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

        {/* Dynamic Subcategories Grid */}
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
                Subcategories added in Masters for {currentCategoryTitle} will automatically appear here.
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
          disabled={!selectedCategory || !selectedSubcategory}
          className="px-8 py-2.5 bg-[#b01622] hover:bg-[#8f1019] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <span>Process Upload</span>
        </button>
      </div>

    </div>
  );
}
