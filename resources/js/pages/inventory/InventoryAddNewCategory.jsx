import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function InventoryAddNewCategory() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [categories, setCategories] = useState([]);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState('gold');
  const [selectedCategoryObj, setSelectedCategoryObj] = useState(null);

  // Category definitions matching user's requested 5 items
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

      // Default to Gold or first matching
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

  const handleProcessUpload = () => {
    if (selectedCategoryObj) {
      sessionStorage.setItem('inventory_selected_category', JSON.stringify(selectedCategoryObj));
      navigate('/inventory/add-new/subcategory');
      return;
    }

    showToast('Please select a category to proceed', 'warning');
  };

  return (
    <div className="w-full pb-16 space-y-6 font-['Inter',-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif] max-w-5xl mx-auto">
      
      {/* 1. Stepper Header */}
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

      {/* 2. Select Inventory Category Card */}
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

        {/* 5 Category Cards:
            - Default: gentle light pink (bg-[#fff5f5], border-rose-200/60)
            - Hover: bg-[#ffe4e6]/60, border-rose-300
            - Selected: uses the perfect hover pink (bg-[#ffe4e6], border-[#b01622], ring-2 ring-red-100)
        */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-1">
          {categoryDefinitions.map((catDef) => {
            const isSelected = selectedCategoryKey === catDef.key;
            return (
              <div
                key={catDef.key}
                onClick={() => handleSelectCategory(catDef)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer text-center flex flex-col items-center justify-between min-h-[155px] ${
                  isSelected
                    ? 'bg-[#ffe4e6] border-[#b01622] ring-2 ring-red-100 shadow-sm scale-[1.02]'
                    : 'bg-[#fff5f5] border-rose-200/60 hover:bg-[#ffe4e6]/60 hover:border-rose-300 shadow-2xs'
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base mb-2 transition-transform ${
                  isSelected ? 'scale-110 text-[#b01622]' :
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
                  <p className={`text-[10px] leading-snug mt-1.5 px-1 ${
                    isSelected ? 'text-stone-600 font-medium' : 'text-stone-500'
                  }`}>
                    {catDef.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Action Buttons (Directly below category card, Drag & Drop removed) */}
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
