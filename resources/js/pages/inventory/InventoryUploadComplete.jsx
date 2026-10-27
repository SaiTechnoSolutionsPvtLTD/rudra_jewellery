import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function InventoryUploadComplete() {
  const navigate = useNavigate();

  // Instant synchronous hydration from session or local storage cache
  const [items, setItems] = useState(() => {
    try {
      const sessionSaved = sessionStorage.getItem('inventory_last_uploaded_items');
      if (sessionSaved) {
        const parsed = JSON.parse(sessionSaved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}

    try {
      const localCached = localStorage.getItem('rudhra_inventory_products');
      if (localCached) {
        const parsed = JSON.parse(localCached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}

    return [];
  });

  const [dbStats, setDbStats] = useState(null);
  const [loading, setLoading] = useState(false);

  // Helper to extract attributes whether raw object or JSON string
  const getAttrs = (item) => {
    if (!item) return {};
    if (typeof item.attributes === 'string') {
      try {
        return JSON.parse(item.attributes) || {};
      } catch {
        return {};
      }
    }
    return item.attributes || {};
  };

  const getItemGrossWt = (item) => {
    const attrs = getAttrs(item);
    const wt = parseFloat(item.gross_wt ?? attrs.gross_wt ?? item.opening_stock_weight ?? 0);
    return isNaN(wt) ? 0 : wt;
  };

  const getItemNetWt = (item) => {
    const attrs = getAttrs(item);
    const wt = parseFloat(item.net_wt ?? attrs.net_wt ?? item.opening_fine_weight ?? getItemGrossWt(item));
    return isNaN(wt) ? 0 : wt;
  };

  const getItemPureWt = (item) => {
    const attrs = getAttrs(item);
    const wt = parseFloat(item.pure_weight ?? attrs.pure_weight ?? getItemNetWt(item));
    return isNaN(wt) ? 0 : wt;
  };



  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const res = await api.get('/inventory?per_page=20');
        const dbProducts = res.data?.products?.data || res.data?.products || [];
        const stats = res.data?.stats || null;
        setDbStats(stats);

        const saved = sessionStorage.getItem('inventory_last_uploaded_items');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const matchedDb = dbProducts.find((p) => p.id === parsed[0].id || (p.product_code && p.product_code === parsed[0].product_code));
            if (matchedDb) {
              setItems([matchedDb]);
              return;
            }
            setItems(parsed);
            return;
          }
        }
        if (dbProducts.length > 0) setItems(dbProducts);
      } catch (err) {
        console.error('Failed to load inventory for complete page', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleStartNewUpload = () => {
    sessionStorage.removeItem('inventory_selected_category');
    sessionStorage.removeItem('inventory_selected_subcategory');
    sessionStorage.removeItem('inventory_last_uploaded_items');
    navigate('/inventory/add-new/category');
  };

  const [failedImages, setFailedImages] = useState({});

  const getImageSrc = (comp) => {
    const attrs = getAttrs(comp);
    const parentAttrs = comp.parentItem ? getAttrs(comp.parentItem) : {};

    let src = comp.thumb_image || comp.image || (comp.images && comp.images[0]) ||
              attrs.thumb_image || attrs.image || (attrs.images && attrs.images[0]) ||
              comp.parentItem?.thumb_image || comp.parentItem?.image ||
              (comp.parentItem?.images && comp.parentItem.images[0]) ||
              parentAttrs.thumb_image || parentAttrs.image || (parentAttrs.images && parentAttrs.images[0]);

    if (!src || typeof src !== 'string') return null;
    if (src.startsWith('data:') || src.startsWith('blob:') || src.startsWith('http://') || src.startsWith('https://')) {
      return src;
    }
    if (!src.startsWith('/')) {
      return '/' + src;
    }
    return src;
  };

  // --- Aggregated Totals & Breakdowns ---
  const primaryItem = items[0] || null;
  const primaryAttrs = getAttrs(primaryItem);

  const grossWtTotal = items.reduce((sum, it) => {
    const attrs = getAttrs(it);
    return sum + (parseFloat(it.gross_wt ?? attrs.gross_wt ?? 0) || 0);
  }, 0);

  const netGoldWtTotal = items.reduce((sum, it) => {
    const attrs = getAttrs(it);
    return sum + (parseFloat(it.net_wt ?? attrs.net_wt ?? it.gross_wt ?? attrs.gross_wt ?? 0) || 0);
  }, 0);

  const fineGoldWtTotal = items.reduce((sum, it) => {
    const attrs = getAttrs(it);
    const net = parseFloat(it.net_wt ?? attrs.net_wt ?? it.gross_wt ?? attrs.gross_wt ?? 0) || 0;
    const pur = parseFloat(it.purity ?? attrs.purity ?? 91.6) || 0;
    const calc = net * (pur / 100);
    return sum + (parseFloat(it.pure_weight ?? attrs.pure_weight ?? calc) || 0);
  }, 0);

  const primaryPurity = primaryItem?.purity || primaryAttrs.purity || '91.6%';

  let totalDiamondWt = 0;
  let totalStoneWt = 0;
  let totalGoldPurchaseVal = 0;
  let totalDiamondPurchaseVal = 0;
  let totalStonePurchaseVal = 0;

  items.forEach((it) => {
    const attrs = getAttrs(it);
    const comps = it.components || attrs.components || [];

    const goldVal = parseFloat(it.gold_purchase_value ?? attrs.gold_purchase_value ?? attrs.purchase_value ?? 0) || 0;
    const goldRate = parseFloat(it.gold_purchase_rate ?? attrs.gold_purchase_rate ?? attrs.purchase_rate ?? 0) || 0;
    const netWt = parseFloat(it.net_wt ?? attrs.net_wt ?? it.gross_wt ?? attrs.gross_wt ?? 0) || 0;
    totalGoldPurchaseVal += goldVal > 0 ? goldVal : (goldRate > 0 && netWt > 0 ? (netWt * goldRate) : 0);

    const diaVal = parseFloat(it.diamond_purchase_value ?? attrs.diamond_purchase_value ?? 0) || 0;
    const stoneVal = parseFloat(it.stone_purchase_value ?? attrs.stone_purchase_value ?? 0) || 0;

    let rowDiaVal = 0;
    let rowStoneVal = 0;
    let rowDiaWt = 0;
    let rowStoneWt = 0;

    comps.forEach((c) => {
      const cName = (c.category_name || c.item_name || c.component_type || '').toLowerCase();
      const isDia = c.is_diamond || cName.includes('diamond') || cName.includes('solitaire') || /\bdia\b/.test(cName);
      const isStn = !isDia && (c.is_stone || cName.includes('stone') || cName.includes('gem') || cName.includes('pearl') || cName.includes('cz') || cName.includes('ruby') || cName.includes('emerald') || cName.includes('sapphire') || cName.includes('colour'));
      const wt = parseFloat(c.stone_weight ?? c.gross_wt ?? 0) || 0;
      const rate = parseFloat(c.purchase_rate ?? c.rate ?? 0) || 0;
      const val = parseFloat(c.purchase_value ?? (rate > 0 ? wt * rate : 0)) || 0;

      if (isDia) {
        rowDiaWt += wt;
        rowDiaVal += val;
      } else if (isStn) {
        rowStoneWt += wt;
        rowStoneVal += val;
      }
    });

    const attrDiaWt = parseFloat(it.dia_wt_ct ?? attrs.dia_wt_ct ?? it.diamond_weight ?? attrs.diamond_weight ?? 0) || 0;
    const finalDiaWt = rowDiaWt > 0 ? rowDiaWt : attrDiaWt;
    totalDiamondWt += finalDiaWt;

    const attrStoneWt = parseFloat(it.stone_weight ?? attrs.stone_weight ?? 0) || 0;
    const finalStoneWt = rowStoneWt > 0 ? rowStoneWt : attrStoneWt;
    totalStoneWt += finalStoneWt;

    totalDiamondPurchaseVal += (diaVal > 0 ? diaVal : rowDiaVal);

    // Stone purchase value strictly applies when colour stones exist; never duplicate gold value
    const hasStones = finalStoneWt > 0 || comps.some((c) => {
      const cName = (c.category_name || c.item_name || c.component_type || '').toLowerCase();
      return c.is_stone || (!c.is_diamond && !cName.includes('diamond') && (cName.includes('stone') || cName.includes('gem') || cName.includes('colour')));
    });

    if (hasStones) {
      totalStonePurchaseVal += (rowStoneVal > 0 ? rowStoneVal : (stoneVal > 0 && stoneVal !== goldVal ? stoneVal : 0));
    }
  });

  const overallPurchaseVal = totalGoldPurchaseVal + totalDiamondPurchaseVal + totalStonePurchaseVal;

  return (
    <div className="w-full pb-20 space-y-6 font-['Inter',-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif] max-w-5xl mx-auto pt-1">

      {/* 1. Header Stepper */}
      <div className="flex items-center justify-center pt-2 pb-4">
        <div className="flex items-center justify-between w-full max-w-lg relative px-6">
          <div className="absolute top-4 left-14 right-14 h-[2px] bg-[#d1d5db] z-0">
            <div className="h-full bg-[#b01622] w-full"></div>
          </div>

          {/* Step 1 */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-9 h-9 rounded-full bg-[#b01622] text-white flex items-center justify-center text-sm font-bold shadow-xs">
              1
            </div>
            <span className="text-xs font-bold text-[#b01622] mt-2">Main Product</span>
          </div>

          {/* Step 2 */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-9 h-9 rounded-full bg-[#b01622] text-white flex items-center justify-center text-sm font-bold shadow-xs">
              2
            </div>
            <span className="text-xs font-bold text-[#b01622] mt-2">Components</span>
          </div>

          {/* Step 3 */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-9 h-9 rounded-full bg-[#b01622] text-white flex items-center justify-center text-sm font-bold shadow-xs">
              3
            </div>
            <span className="text-xs font-bold text-[#b01622] mt-2">Complete</span>
          </div>
        </div>
      </div>

      {/* 2. Top Banner */}
      <div className="bg-[#fdf2f2] border border-[#fbd5d5] rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#b01622] text-white flex items-center justify-center text-xl font-black shrink-0 shadow-sm">
            <i className="fa-solid fa-check"></i>
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-[#b01622] tracking-tight">
              Product Upload Complete!
            </h2>
            <p className="text-xs text-stone-700 leading-relaxed font-normal mt-0.5">
              Product and components successfully created and added to physical inventory stock.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleStartNewUpload}
            className="px-5 py-2.5 bg-[#b01622] hover:bg-[#8f1019] text-white rounded-xl text-xs font-bold shadow-2xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-plus text-xs"></i>
            <span>Add Another Product</span>
          </button>
        </div>
      </div>

      {/* 3. Detailed Weight & Monetary Success Summary Cards */}
      <div className="space-y-3">
        <span className="text-[11px] font-extrabold text-stone-500 uppercase tracking-wider block">
          PURCHASE VALUATION &amp; WEIGHT BREAKDOWN
        </span>

        {/* 9 Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">

          {/* Metric 1: Gross Weight */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs">
            <span className="text-[10.5px] font-bold text-stone-500 uppercase tracking-wider block">Gross Weight</span>
            <span className="text-xl font-black text-stone-900 font-mono block mt-1">
              {grossWtTotal.toFixed(3)} g
            </span>
            <span className="text-[10px] text-stone-400 font-medium block mt-0.5">Total Physical Gross</span>
          </div>

          {/* Metric 2: Net Gold Weight */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs">
            <span className="text-[10.5px] font-bold text-amber-700 uppercase tracking-wider block">Net Gold Weight</span>
            <span className="text-xl font-black text-amber-900 font-mono block mt-1">
              {netGoldWtTotal.toFixed(3)} g
            </span>
            <span className="text-[10px] text-stone-400 font-medium block mt-0.5">Physical Net Metal</span>
          </div>

          {/* Metric 3: Fine Gold Weight & Purity */}
          <div className="bg-white rounded-2xl p-4 border border-amber-200/90 bg-amber-50/30 shadow-2xs">
            <span className="text-[10.5px] font-bold text-amber-800 uppercase tracking-wider block">Fine Gold Weight &amp; Purity</span>
            <span className="text-xl font-black text-amber-900 font-mono block mt-1">
              {fineGoldWtTotal.toFixed(3)} g
            </span>
            <span className="text-[10px] text-amber-700 font-semibold block mt-0.5">Purity: {primaryPurity}</span>
          </div>

          {/* Metric 4: Total Diamond Weight */}
          <div className="bg-white rounded-2xl p-4 border border-blue-200/90 bg-blue-50/30 shadow-2xs">
            <span className="text-[10.5px] font-bold text-blue-700 uppercase tracking-wider block">Total Diamond Weight</span>
            <span className="text-xl font-black text-blue-900 font-mono block mt-1">
              {totalDiamondWt.toFixed(3)} ct
            </span>
            <span className="text-[10px] text-blue-600 font-semibold block mt-0.5">Diamond Carat Stock</span>
          </div>

          {/* Metric 5: Total Stone Weight */}
          <div className="bg-white rounded-2xl p-4 border border-emerald-200/90 bg-emerald-50/30 shadow-2xs">
            <span className="text-[10.5px] font-bold text-emerald-700 uppercase tracking-wider block">Total Stone Weight</span>
            <span className="text-xl font-black text-emerald-900 font-mono block mt-1">
              {totalStoneWt.toFixed(3)} ct
            </span>
            <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">Colour Stone Carat Stock</span>
          </div>

          {/* Metric 6: Total Gold Purchase Value */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs">
            <span className="text-[10.5px] font-bold text-stone-600 uppercase tracking-wider block">Total Gold Purchase Value</span>
            <span className="text-xl font-black text-stone-900 font-mono block mt-1">
              ₹ {Math.round(totalGoldPurchaseVal).toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-stone-400 font-medium block mt-0.5">Net Wt × Gold Rate</span>
          </div>

          {/* Metric 7: Total Diamond Purchase Value */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs">
            <span className="text-[10.5px] font-bold text-blue-800 uppercase tracking-wider block">Total Diamond Purchase Value</span>
            <span className="text-xl font-black text-blue-900 font-mono block mt-1">
              ₹ {Math.round(totalDiamondPurchaseVal).toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-stone-400 font-medium block mt-0.5">Carats × Diamond Rate</span>
          </div>

          {/* Metric 8: Total Stone Purchase Value */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs">
            <span className="text-[10.5px] font-bold text-emerald-800 uppercase tracking-wider block">Total Stone Purchase Value</span>
            <span className="text-xl font-black text-emerald-900 font-mono block mt-1">
              ₹ {Math.round(totalStonePurchaseVal).toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-stone-400 font-medium block mt-0.5">Weight × Stone Rate</span>
          </div>

          {/* Metric 9: Overall Purchase Value */}
          <div className="bg-white rounded-2xl p-4 border-2 border-[#b01622] bg-red-50/20 shadow-2xs">
            <span className="text-[10.5px] font-extrabold text-[#b01622] uppercase tracking-wider block">Overall Purchase Value</span>
            <span className="text-2xl font-black text-[#b01622] font-mono block mt-1">
              ₹ {Math.round(overallPurchaseVal).toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-[#b01622] font-bold block mt-0.5">Total Valuation</span>
          </div>

        </div>
      </div>

      {/* 4. Products & Components Detailed Breakdown Table */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/60">
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              Uploaded Item Specifications &amp; Component Breakdown
            </h3>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Each component group is stored and calculated separately.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-200 bg-[#f8f9fa] text-stone-800 font-bold text-center text-xs">
                <th className="py-4 px-3 text-center w-12">S.No</th>
                <th className="py-4 px-4 text-center">Product Image</th>
                <th className="py-4 px-4 text-center">Component / Product</th>
                <th className="py-4 px-4 text-center">Type</th>
                <th className="py-4 px-4 text-center">Stamp / Sieve</th>
                <th className="py-4 px-4 text-center">Unit</th>
                <th className="py-4 px-4 text-center">Pieces</th>
                <th className="py-4 px-4 text-center">Weight</th>
                <th className="py-4 px-4 text-center">Purchase Rate</th>
                <th className="py-4 px-4 text-center">Purchase Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {(() => {
                let tableRows = [];
                if (items.length > 0) {
                  items.forEach((it) => {
                    const attrs = getAttrs(it);
                    const comps = it.components || attrs.components;
                    if (Array.isArray(comps) && comps.length > 0) {
                      comps.forEach((c) => tableRows.push({ ...c, parentItem: it }));
                    } else {
                      tableRows.push(it);
                    }

                    // Check if diamond component is present in tableRows
                    const hasDiaComp = tableRows.some((c) => {
                      const cName = (c.category_name || c.item_name || c.component_type || '').toLowerCase();
                      return c.is_diamond || cName.includes('diamond') || cName.includes('solitaire') || /\bdia\b/.test(cName);
                    });
                    const diaWt = parseFloat(it.dia_wt_ct ?? attrs.dia_wt_ct ?? it.diamond_weight ?? attrs.diamond_weight ?? 0) || 0;
                    const diaCount = parseInt(it.diamond_count ?? attrs.diamond_count ?? 0, 10) || 0;
                    if (!hasDiaComp && (diaWt > 0 || diaCount > 0)) {
                      tableRows.push({
                        category_name: 'Diamond',
                        item_name: 'Diamond',
                        component_type: 'Diamond',
                        is_diamond: true,
                        stamp: it.diamond_stamp ?? attrs.diamond_stamp ?? '-',
                        unit: 'ct',
                        no_of_pieces: diaCount || 1,
                        stone_weight: diaWt,
                        gross_wt: diaWt,
                        purchase_rate: parseFloat(it.diamond_purchase_rate ?? attrs.diamond_purchase_rate ?? 0) || 0,
                        purchase_value: parseFloat(it.diamond_purchase_value ?? attrs.diamond_purchase_value ?? 0) || 0,
                        parentItem: it,
                      });
                    }

                    // Check if colour stone component is present
                    const hasStoneComp = tableRows.some((c) => {
                      const cName = (c.category_name || c.item_name || c.component_type || '').toLowerCase();
                      return c.is_stone || (!c.is_diamond && !cName.includes('diamond') && (cName.includes('stone') || cName.includes('gem') || cName.includes('ruby') || cName.includes('emerald') || cName.includes('sapphire') || cName.includes('colour')));
                    });
                    const stoneWt = parseFloat(it.stone_weight ?? attrs.stone_weight ?? 0) || 0;
                    if (!hasStoneComp && stoneWt > 0) {
                      tableRows.push({
                        category_name: 'Colour Stone',
                        item_name: 'Colour Stone',
                        component_type: 'Stone',
                        is_stone: true,
                        stamp: it.stone_stamp ?? attrs.stone_stamp ?? '-',
                        unit: 'ct',
                        no_of_pieces: parseInt(it.stone_pieces ?? attrs.stone_pieces ?? 1, 10),
                        stone_weight: stoneWt,
                        gross_wt: stoneWt,
                        purchase_rate: parseFloat(it.stone_purchase_rate ?? attrs.stone_purchase_rate ?? 0) || 0,
                        purchase_value: parseFloat(it.stone_purchase_value ?? attrs.stone_purchase_value ?? 0) || 0,
                        parentItem: it,
                      });
                    }
                  });
                }

                if (tableRows.length === 0) {
                  tableRows = [
                    { category_name: 'Gold Stud', component_type: 'Metal', stamp: '916', unit: 'g', no_of_pieces: 1, gross_wt: 10.0, purchase_rate: 6800, purchase_value: 68000 },
                    { category_name: 'Diamond', component_type: 'Diamond', stamp: '+5', unit: 'ct', no_of_pieces: 3, stone_weight: 0.67, purchase_rate: 50000, purchase_value: 33500 },
                    { category_name: 'Colour Stone', component_type: 'Stone', stamp: '+4', unit: 'ct', no_of_pieces: 5, stone_weight: 3.0, purchase_rate: 500, purchase_value: 1500 }
                  ];
                }

                return tableRows.map((comp, idx) => {
                  const attrs = getAttrs(comp);
                  const catName = comp.item_name || comp.category_name || comp.category?.name || 'Component';
                  const catLower = catName.toLowerCase();
                  const isDia = comp.is_diamond || comp.component_type === 'Diamond' || catLower.includes('diamond') || catLower.includes('solitaire') || /\bdia\b/.test(catLower);
                  const isStn = !isDia && (comp.is_stone || comp.component_type === 'Stone' || catLower.includes('stone') || catLower.includes('gem') || catLower.includes('pearl') || catLower.includes('cz') || catLower.includes('ruby') || catLower.includes('emerald') || catLower.includes('sapphire') || catLower.includes('colour'));
                  let compType = isDia ? 'Diamond' : (isStn ? 'Stone' : comp.component_type);
                  if (!compType || compType === 'Metal') {
                    const cat = (comp.category_name || comp.category?.name || comp.item_name || primaryItem?.category?.name || '').toLowerCase();
                    if (cat.includes('gold')) {
                      compType = 'Gold';
                    } else if (cat.includes('silver')) {
                      compType = 'Silver';
                    } else if (cat.includes('platinum')) {
                      compType = 'Platinum';
                    } else {
                      compType = primaryItem?.category?.name || 'Gold';
                    }
                  }
                  const parentAttrs = comp.parentItem ? getAttrs(comp.parentItem) : {};
                  const stamp = isDia
                    ? (comp.stamp && comp.stamp !== '-' && comp.stamp !== '0.00' ? comp.stamp : (comp.diamond_stamp || attrs.diamond_stamp || parentAttrs.diamond_stamp || '-'))
                    : (isStn
                        ? (comp.stamp && comp.stamp !== '-' && comp.stamp !== '0.00' ? comp.stamp : (comp.stone_stamp || attrs.stone_stamp || parentAttrs.stone_stamp || '-'))
                        : (comp.stamp && comp.stamp !== '0.00' ? comp.stamp : (attrs.stamp || parentAttrs.stamp || '916'))
                      );
                  const unit = comp.unit ?? attrs.unit ?? (isDia || isStn ? 'ct' : 'g');
                  const pieces = comp.no_of_pieces ?? attrs.no_of_pieces ?? 1;
                  const isPrimaryMetal = !isDia && !isStn;
                  const weightVal = parseFloat(isPrimaryMetal && comp.net_wt ? comp.net_wt : (comp.stone_weight ?? comp.gross_wt ?? attrs.stone_weight ?? attrs.gross_wt ?? getItemGrossWt(comp) ?? 0));
                  const rateVal = parseFloat(
                    comp.purchase_rate ??
                    (isDia ? (attrs.diamond_purchase_rate ?? parentAttrs.diamond_purchase_rate) : (isStn ? (attrs.stone_purchase_rate ?? parentAttrs.stone_purchase_rate) : (attrs.gold_purchase_rate ?? attrs.purchase_rate ?? parentAttrs.gold_purchase_rate ?? parentAttrs.purchase_rate))) ??
                    0
                  );
                  const purchaseVal = parseFloat(
                    comp.purchase_value ??
                    (rateVal > 0 && weightVal > 0 ? weightVal * rateVal : (isDia ? (attrs.diamond_purchase_value ?? parentAttrs.diamond_purchase_value) : (isStn ? (attrs.stone_purchase_value ?? parentAttrs.stone_purchase_value) : (attrs.gold_purchase_value ?? attrs.purchase_value ?? parentAttrs.gold_purchase_value ?? parentAttrs.purchase_value)))) ??
                    0
                  );

                  const imgSrc = getImageSrc(comp);

                  return (
                    <tr key={idx} className="hover:bg-stone-50/60 transition-colors text-center text-xs font-medium text-gray-800">
                      <td className="py-3 px-3 text-center font-mono text-stone-400 font-medium">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {imgSrc && !failedImages[idx] ? (
                          <img
                            src={imgSrc}
                            alt={comp.item_name || `Component ${idx + 1}`}
                            className="w-10 h-10 object-cover rounded-xl border border-stone-200 mx-auto shadow-2xs"
                            onError={() => setFailedImages((prev) => ({ ...prev, [idx]: true }))}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/80 flex items-center justify-center font-bold text-xs mx-auto shadow-2xs">
                            <i className="fa-solid fa-gem text-amber-700"></i>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center text-gray-900 font-bold">
                        {catName}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          compType === 'Diamond'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : compType === 'Stone' || compType === 'Colour Stone'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : compType === 'Silver'
                            ? 'bg-slate-100 text-slate-800 border-slate-300'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {compType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-stone-700 font-semibold font-mono">
                        {stamp}
                      </td>
                      <td className="py-3 px-4 text-center text-stone-600 font-bold">
                        {unit}
                      </td>
                      <td className="py-3 px-4 text-center text-gray-900 font-black">
                        {pieces}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-gray-900">
                        {weightVal.toFixed(3)} {isCt ? 'ct' : 'g'}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-stone-700">
                        {rateVal > 0 ? `₹${rateVal.toLocaleString('en-IN')}/${isCt ? 'ct' : 'g'}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-[#b01622]">
                        {purchaseVal > 0 ? `₹${purchaseVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
        <Link
          to="/inventory"
          className="w-full sm:w-auto px-8 py-3.5 bg-[#b01622] hover:bg-[#8f1019] text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>View Updated Inventory</span>
          <i className="fa-solid fa-arrow-right text-xs"></i>
        </Link>

        <button
          type="button"
          onClick={handleStartNewUpload}
          className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-red-50/30 text-[#b01622] border-2 border-[#b01622] rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <i className="fa-solid fa-upload text-xs"></i>
          <span>Start New Upload</span>
        </button>
      </div>

    </div>
  );
}
