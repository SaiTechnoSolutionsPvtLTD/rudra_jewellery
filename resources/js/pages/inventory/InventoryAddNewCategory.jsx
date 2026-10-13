import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function InventoryAddNewCategory() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const scrollContainerRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Dynamic visual styling helper for database category records
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

    // Default styling for any new category added in Masters
    return {
      badgeBg: 'bg-[#fdf2f8]',
      iconColor: 'text-[#b01622]',
      icon: 'fa-solid fa-crown',
      defaultDesc: 'Finest quality handcrafted jewelry collection',
    };
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const updateScrollButtons = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth + 5;
    setCanScrollLeft(el.scrollLeft > 5);
    setCanScrollRight(hasOverflow && el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
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
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.8;
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get('/inventory/categories');
      const cats = Array.isArray(res.data)
        ? res.data
        : res.data?.categories || res.data?.data || [];

      // Filter only active categories
      const activeCats = cats.filter((c) => c.status === 'active');
      setCategories(activeCats);

      // Check session storage for existing selection
      const saved = sessionStorage.getItem('inventory_selected_category');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.id) {
            const matched = activeCats.find((c) => c.id === parsed.id || String(c.id) === String(parsed.id));
            if (matched) {
              setSelectedCategory(matched);
              return;
            }
          }
        } catch (e) {
          console.warn('Failed parsing saved category from session', e);
        }
      }

      // Default selection to first active category (or Gold if available)
      if (activeCats.length > 0) {
        const goldCat = activeCats.find((c) => (c.name || '').toLowerCase() === 'gold') || activeCats[0];
        setSelectedCategory(goldCat);
        sessionStorage.setItem('inventory_selected_category', JSON.stringify(goldCat));
      }
    } catch (err) {
      console.error('Failed to load categories', err);
      showToast('Failed to load categories from database', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCategory = (cat) => {
    setSelectedCategory(cat);
    sessionStorage.setItem('inventory_selected_category', JSON.stringify(cat));
  };

  const handleProcessUpload = () => {
    if (!selectedCategory) {
      showToast('Please select a category first', 'warning');
      return;
    }

    sessionStorage.setItem('inventory_selected_category', JSON.stringify(selectedCategory));
    navigate('/inventory/add-new/subcategory');
  };

  return (
    <div className="w-full pb-16 space-y-6 font-['Inter',-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif] max-w-5xl mx-auto">
      
      {/* 1. Stepper Header */}
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

      {/* 2. Select Inventory Category Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-stone-200/80 shadow-2xs space-y-6 relative">
        
        {/* Header with Red Box Icon and scroll arrows if > 5 items */}
        <div className="flex items-center justify-between">
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

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 pt-1">
            {[1, 2, 3, 4, 5].map((idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl border border-stone-200/60 bg-[#fff7f8]/50 min-h-[170px] animate-pulse flex flex-col items-center justify-center"
              >
                <div className="w-12 h-12 rounded-full bg-stone-200 mb-3"></div>
                <div className="w-16 h-3 bg-stone-200 rounded mb-2"></div>
                <div className="w-20 h-2 bg-stone-200 rounded"></div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && categories.length === 0 && (
          <div className="py-12 text-center border-2 border-dashed border-stone-200 rounded-2xl bg-stone-50/50">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-[#b01622] flex items-center justify-center mx-auto mb-3">
              <i className="fa-solid fa-folder-open text-lg"></i>
            </div>
            <p className="text-xs font-semibold text-gray-800">No active categories found in database</p>
            <p className="text-[11px] text-stone-400 mt-1">Please add category masters or activate existing ones.</p>
          </div>
        )}

        {/* Category Cards Viewport (Exactly 5 items visible per view + scrollable if > 5) */}
        {!loading && categories.length > 0 && (
          <div className="relative">
            <div
              ref={scrollContainerRef}
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
                    className={`p-4 rounded-2xl border transition-all cursor-pointer text-center flex flex-col items-center justify-between min-h-[170px] ${
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
                      {/* Category Title */}
                      <div className="font-bold text-xs sm:text-sm text-[#8b131b] truncate max-w-full">
                        {cat.name}
                      </div>

                      {/* Gold/Bronze Underline Accent Bar */}
                      <div className="w-8 h-[2.5px] bg-[#c5a059] my-2 rounded-full opacity-90"></div>

                      {/* Description */}
                      <p className="text-[11px] text-stone-700 font-medium leading-tight px-1 text-center line-clamp-2">
                        {desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
          disabled={!selectedCategory || loading}
          className={`px-8 py-2.5 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer ${
            selectedCategory && !loading
              ? 'bg-[#b01622] hover:bg-[#8f1019]'
              : 'bg-stone-300 cursor-not-allowed'
          }`}
        >
          <span>Process Upload</span>
        </button>
      </div>

    </div>
  );
}
