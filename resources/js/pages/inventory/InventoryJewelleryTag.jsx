import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import JewelleryTagCard, { buildPrintableTagsHtml, isMetalPurityStamp } from '../../components/JewelleryTagCard';
import { cleanProductName } from '../../utils/formatters';

export default function InventoryJewelleryTag() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [attributes, setAttributes] = useState({});
  const [loading, setLoading] = useState(true);
  const [printCopies, setPrintCopies] = useState(1);

  useEffect(() => {
    api.get(`/inventory/products/${id}`)
      .then((res) => {
        const prod = res.data.product || {};
        const attrs = res.data.attributes || {};
        setProduct(prod);
        setAttributes(attrs);

        // Default copies to product quantity (or 1)
        const q = Math.max(
          1,
          parseInt(
            attrs.quantity ||
            attrs.stock_qty ||
            attrs.no_of_pieces ||
            prod.current_stock_qty ||
            prod.opening_stock_qty ||
            1,
            10
          )
        );
        setPrintCopies(q);
      })
      .catch((err) => {
        console.error('Failed to load product tag details:', err);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center text-stone-500 text-sm font-medium">
        <i className="fa-solid fa-circle-notch fa-spin mr-2 text-[#b01622] text-xl"></i>
        <span>Loading Jewellery Tag...</span>
      </div>
    );
  }

  // 1. Determine Product Quantity
  const qty = Math.max(
    1,
    parseInt(
      attributes?.quantity ||
      attributes?.stock_qty ||
      attributes?.no_of_pieces ||
      product?.current_stock_qty ||
      product?.opening_stock_qty ||
      1,
      10
    )
  );

  // 2. Weights: Calculate single-unit values if quantity > 1
  const rawGross = parseFloat(
    attributes?.gross_wt ??
    product?.gross_wt ??
    product?.opening_stock_weight ??
    0
  );
  const unitGross = (rawGross > 0 && qty > 1) ? (rawGross / qty) : rawGross;

  const rawNet = parseFloat(
    attributes?.net_wt ??
    product?.net_wt ??
    product?.opening_fine_weight ??
    0
  );
  const unitNet = (rawNet > 0 && qty > 1) ? (rawNet / qty) : (rawNet > 0 ? rawNet : null);

  // 3. Diamond Components and Direct Attributes
  const componentsList = Array.isArray(attributes?.components) ? attributes.components : [];
  const diaComps = componentsList.filter((c) => {
    const cName = (c.category_name || c.item_name || c.component_type || '').toLowerCase();
    return (
      cName.includes('diamond') ||
      cName.includes('dia') ||
      ((c.unit || '').toLowerCase().includes('carat') && parseFloat(c.stone_weight || c.gross_wt || 0) > 0)
    );
  });

  let rawDiaWt = 0;
  let rawDiaCount = 0;
  let diaStamp = '';

  if (diaComps.length > 0) {
    diaComps.forEach((c) => {
      rawDiaWt += parseFloat(c.stone_weight || c.gross_wt || c.weight || 0);
      rawDiaCount += parseInt(c.no_of_pieces || c.quantity || 0, 10);
      if (!diaStamp && c.stamp && !isMetalPurityStamp(c.stamp)) {
        diaStamp = c.stamp;
      }
    });
  } else {
    rawDiaWt = parseFloat(attributes?.dia_wt_ct || attributes?.diamond_wt || attributes?.dia_wt || 0);
    rawDiaCount = parseInt(attributes?.dia_count || attributes?.diamond_count || 0, 10);
    const candStamp = attributes?.diamond_stamp || '';
    if (candStamp && !isMetalPurityStamp(candStamp)) {
      diaStamp = candStamp;
    } else {
      diaStamp = '';
    }
  }

  const unitDiaWt = (rawDiaWt > 0 && qty > 1) ? (rawDiaWt / qty) : rawDiaWt;
  const unitDiaCount = (rawDiaCount > 0 && qty > 1) ? Math.max(1, Math.round(rawDiaCount / qty)) : rawDiaCount;
  const hasDiamonds = unitDiaWt > 0 || unitDiaCount > 0;

  // 4. Design Number: From entered design_no, falling back to SKU/Code
  const rawDesign = (product?.design_no || attributes?.design_no || '').trim();
  const designNo = rawDesign || product?.product_code || product?.sku || '—';

  // 5. Karat / Stamp
  const catName = (product?.category?.name || attributes?.category_name || '').toLowerCase();
  const isSilver = catName.includes('silver');
  const rawKarat = product?.karat || attributes?.karat || attributes?.purity || attributes?.gold_type || '22K';

  let displayKarat = '22K';
  if (isSilver) {
    displayKarat = product?.stamp || attributes?.stamp || '925';
  } else if (rawKarat) {
    const kMatch = String(rawKarat).match(/(\d+K)/i);
    if (kMatch) {
      displayKarat = kMatch[1].toUpperCase();
    } else {
      displayKarat = String(rawKarat).split(' ')[0] || '22K';
    }
  }

  // 6. Tag Number / Barcode
  const tagNo = product?.master_tag_number || product?.product_code || product?.sku || attributes?.sku || '';

  // 7. Piece Data Object strictly matching JewelleryTagCard & ReceiverWork format
  const singlePiece = {
    id: product?.id,
    tag_number: tagNo,
    product_code: product?.product_code || '',
    sku: product?.sku || '',
    design_no: designNo,
    gold_karat: displayKarat,
    gross_weight: unitGross > 0 ? unitGross.toFixed(3) : null,
    net_weight: unitNet > 0 ? unitNet.toFixed(3) : null,
    diamond_weight: hasDiamonds ? unitDiaWt.toFixed(2) : '0.00',
    dynamic_dia_count: hasDiamonds ? unitDiaCount : 0,
    dynamic_stamp: hasDiamonds ? (diaStamp || null) : null,
    diamond_stamp: hasDiamonds ? (diaStamp || null) : null,
    product: {
      id: product?.id,
      master_tag_number: tagNo,
      product_code: product?.product_code,
      design_no: designNo,
      diamond_stamp: hasDiamonds ? (diaStamp || null) : null,
      attributes: {
        ...attributes,
        dia_wt_ct: hasDiamonds ? unitDiaWt.toFixed(2) : '0.00',
        diamond_weight: hasDiamonds ? unitDiaWt.toFixed(2) : '0.00',
        diamond_count: hasDiamonds ? unitDiaCount : 0,
        diamond_stamp: hasDiamonds ? (diaStamp || null) : null,
      },
    },
  };

  // Exact print function identical to Job Order ReceiverWork module
  const handlePrint = (count = 1) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes');
    if (!printWindow) return;
    const items = Array.from({ length: Math.max(1, count) }, () => singlePiece);
    const html = buildPrintableTagsHtml(items, `Jewellery Tag — ${tagNo}`);
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="bg-stone-100 min-h-screen py-8 px-4 font-['Arial',Helvetica,sans-serif]">
      {/* Top Action Bar */}
      <div className="no-print max-w-2xl mx-auto mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            to={`/inventory/products/${id}`}
            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-2"
          >
            <i className="fa-solid fa-arrow-left text-xs"></i>
            <span>Back to Product</span>
          </Link>
          <span className="text-stone-300">|</span>
          <div>
            <h1 className="text-xs font-bold text-stone-800">
              Jewellery Tag Printing
            </h1>
            <span className="text-[10.5px] text-stone-500 font-mono">
              {product?.name || tagNo}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {qty > 1 && (
            <div className="flex items-center gap-1.5 bg-stone-50 px-2.5 py-1.5 rounded-xl border border-stone-200 text-xs">
              <span className="text-[11px] text-stone-500 font-semibold">Copies:</span>
              <select
                value={printCopies}
                onChange={(e) => setPrintCopies(Number(e.target.value))}
                className="bg-white border border-stone-300 rounded-lg px-2 py-0.5 text-xs font-bold text-stone-800 focus:outline-none"
              >
                {Array.from({ length: Math.min(20, Math.max(qty, 5)) }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'tag' : 'tags'}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={() => handlePrint(printCopies)}
            className="px-5 py-2.5 bg-[#b01622] hover:bg-[#8f1019] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-print text-xs"></i>
            <span>Print {printCopies > 1 ? `${printCopies} Tags` : 'Tag'}</span>
          </button>
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center space-y-4">
        {/* Quantity Rule Notice */}
        {qty > 1 && (
          <div className="w-full max-w-xl bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-3 text-amber-900 text-xs">
            <i className="fa-solid fa-circle-info text-amber-600 mt-0.5 text-sm"></i>
            <div className="space-y-0.5">
              <span className="font-bold block">
                Batch Quantity: {qty} Units (Single Product Values Displayed)
              </span>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                As configured, this tag displays values for <strong>1 unit</strong> (Gross Weight: {unitGross.toFixed(3)}g per piece from total {rawGross.toFixed(3)}g entered). Each printed tag represents 1 physical jewellery piece.
              </p>
            </div>
          </div>
        )}

        <div className="text-center space-y-1 mb-1">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
            Job Creation / Receive Work Order Standard Tag Format
          </span>
          <p className="text-[11px] text-stone-400">
            Thermal jewel sticker (125mm × 33mm) with dual flap &amp; fold crease line
          </p>
        </div>

        {/* Exact Receive Work Order Tag Component */}
        <div className="p-6 bg-white rounded-3xl border border-stone-200/90 shadow-sm flex flex-col items-center justify-center gap-3 overflow-x-auto w-full max-w-xl">
          <JewelleryTagCard piece={singlePiece} id="foldable-tag-sheet" />
          <span className="text-[11px] text-stone-400 text-center">
            Dotted line indicates physical fold crease before barcode label.
          </span>
        </div>

        {/* Data Mapping Verification Table */}
        <div className="w-full max-w-xl bg-white rounded-2xl border border-stone-200 p-4 text-xs space-y-2.5">
          <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider block">
            Tag Specifications Summary
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
            <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-100">
              <span className="text-stone-400 block text-[10px] font-semibold uppercase">Product SKU / Tag</span>
              <span className="font-mono font-bold text-stone-900">{tagNo || '—'}</span>
            </div>
            <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-100">
              <span className="text-stone-400 block text-[10px] font-semibold uppercase">Design No</span>
              <span className="font-mono font-bold text-stone-900">{designNo}</span>
            </div>
            <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-100">
              <span className="text-stone-400 block text-[10px] font-semibold uppercase">Unit Gross Weight</span>
              <span className="font-mono font-bold text-[#b01622]">{unitGross > 0 ? `${unitGross.toFixed(3)}g` : '—'}</span>
            </div>
            <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-100">
              <span className="text-stone-400 block text-[10px] font-semibold uppercase">Purity / Karat</span>
              <span className="font-bold text-stone-900">{displayKarat}</span>
            </div>
          </div>
          {qty > 1 && (
            <div className="text-[10.5px] text-stone-500 pt-1 border-t border-stone-100 flex items-center justify-between">
              <span>Total Batch Quantity: <strong>{qty} pcs</strong></span>
              <span>Total Batch Gross Wt: <strong>{rawGross.toFixed(3)}g</strong></span>
              <span>Weight Per Piece: <strong>{unitGross.toFixed(3)}g</strong></span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
