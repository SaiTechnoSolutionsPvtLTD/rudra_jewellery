import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';

/* ───────────────────────────────────────────────────────────
   Reusable SVG Code-128 Barcode Strip
─────────────────────────────────────────────────────────── */
function BarcodeStrip({ code = '', height = 36, color = '#000000' }) {
  if (!code) return <svg width="100%" height="100%" viewBox={`0 0 1 ${height}`} />;
  const bars = [];
  let x = 0;
  const seed = code.split('').map((c) => c.charCodeAt(0));
  for (let i = 0; i < 46; i++) {
    const cval = seed[i % seed.length];
    const w = (cval % 3) + 1.2;
    const gap = (cval % 2) + 1.1;
    bars.push({ x: Math.round(x * 10) / 10, w });
    x += w + gap;
  }
  const total = x;
  return (
    <svg width="100%" height="100%" preserveAspectRatio="none" viewBox={`0 0 ${total} ${height}`}>
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={0} width={b.w} height={height} fill={color} />
      ))}
    </svg>
  );
}

export default function InventoryJewelleryTag() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [attributes, setAttributes] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/inventory/products/${id}`)
      .then((res) => {
        setProduct(res.data.product || {});
        setAttributes(res.data.attributes || {});
      })
      .catch((err) => {
        console.error('Failed to load product tag details:', err);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const printTagOnly = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const tagEl = document.getElementById('printable-jewellery-tag');
    if (!tagEl) return;

    const printWindow = window.open('', '_blank', 'width=700,height=400,scrollbars=yes');
    if (!printWindow) return;

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Jewellery Tag — ${product?.product_code || id}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      background: #ffffff;
      color: #000000;
      padding: 15px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @page { size: auto; margin: 0; }
    @media print {
      body { padding: 0; min-height: auto; background: #ffffff !important; }
      .no-print { display: none !important; }
      #printable-jewellery-tag {
        border: none !important;
        box-shadow: none !important;
        margin: 0 !important;
      }
    }
  </style>
</head>
<body>
  ${tagEl.outerHTML}
</body>
</html>`;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 350);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center text-stone-500 text-sm font-medium">
        <i className="fa-solid fa-circle-notch fa-spin mr-2 text-[#b01622] text-xl"></i>
        <span>Loading Jewellery Tag...</span>
      </div>
    );
  }

  // Extract Exact Fields matching reference image format
  const designNo = product?.design_no || attributes?.design_no || product?.sku || product?.product_code || '—';
  const skuCode = product?.master_tag_number || product?.sku || product?.product_code || attributes?.sku || '';
  const catName = (product?.category?.name || attributes?.category_name || '').toLowerCase();
  const isSilver = catName.includes('silver');

  // Weights
  const grossWtVal = parseFloat(attributes?.gross_wt ?? product?.gross_wt ?? product?.opening_stock_weight ?? 0);
  const grossWtStr = grossWtVal > 0 ? grossWtVal.toFixed(3) : '—';

  // Karat / Stamp
  const rawKarat = product?.karat || attributes?.karat || attributes?.purity || attributes?.gold_type || '';
  const karat = isSilver ? (product?.stamp || attributes?.stamp || '—') : (rawKarat.split(' ')[0] || '—');

  // Diamond Extraction
  const componentsList = Array.isArray(attributes?.components) ? attributes.components : [];
  const diamondComponents = componentsList.filter((c) => {
    const cName = (c.category_name || c.item_name || c.component_type || '').toLowerCase();
    return cName.includes('diamond') || cName.includes('dia') || (c.stone_weight && parseFloat(c.stone_weight) > 0);
  });

  let totalDiaWtNum = 0;
  let diaBreakupStr = '';

  if (diamondComponents.length > 0) {
    diamondComponents.forEach((c) => {
      const wt = parseFloat(c.stone_weight || c.gross_wt || c.weight || 0);
      totalDiaWtNum += wt;
    });

    const first = diamondComponents[0];
    const mainWt = parseFloat(first.stone_weight || first.gross_wt || 0).toFixed(2);
    const mainPcs = first.no_of_pieces || first.quantity || '';
    const sizeStr = first.size || first.quality || first.description || '';
    diaBreakupStr = `Dia-${mainWt}/+${mainPcs}U/${sizeStr}`;
  } else {
    const directDiaWt = parseFloat(attributes?.dia_wt_ct || attributes?.diamond_wt || attributes?.dia_wt || 0);
    if (directDiaWt > 0) {
      totalDiaWtNum = directDiaWt;
      diaBreakupStr = `Dia-${directDiaWt.toFixed(2)}`;
    } else {
      // Fallback display if product has no diamonds
      const netWeight = attributes?.net_wt ?? product?.net_wt;
      diaBreakupStr = netWeight != null ? `N.Wt -${parseFloat(netWeight).toFixed(3)}g` : '—';
    }
  }

  const totalDiaWtStr = totalDiaWtNum > 0 ? `T.Dia- ${totalDiaWtNum.toFixed(2)}Ct.` : '';

  return (
    <div className="bg-stone-100 min-h-screen py-8 px-4 font-['Arial',sans-serif]">
      
      {/* Top Action Bar */}
      <div className="no-print max-w-xl mx-auto mb-6 flex items-center justify-between bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            to={`/inventory/products/${id}`}
            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-2"
          >
            <i className="fa-solid fa-arrow-left text-xs"></i>
            <span>Back to Product</span>
          </Link>
          <span className="text-stone-300">|</span>
          <span className="text-xs font-bold text-stone-600">
            Jewellery Thermal Tag
          </span>
        </div>

        <button
          type="button"
          onClick={printTagOnly}
          className="px-6 py-2.5 bg-[#b01622] hover:bg-[#8f1019] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
        >
          <i className="fa-solid fa-print text-xs"></i>
          <span>Print Tag</span>
        </button>
      </div>

      {/* Screen Preview Container */}
      <div className="max-w-xl mx-auto flex flex-col items-center justify-center space-y-4">
        <div className="text-center space-y-1 mb-2">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
            Exact Jewellery Tag Preview
          </span>
          <p className="text-[11px] text-stone-400">
            Clicking "Print Tag" outputs this exact thermal label format for stickering on jewels.
          </p>
        </div>

        {/* 1:1 Exact Reference Tag Card Element */}
        <div
          id="printable-jewellery-tag"
          className="bg-white border-2 border-black rounded-lg p-3 shadow-md select-none font-['Arial',sans-serif] text-black"
          style={{
            width: '105mm',
            minHeight: '32mm',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'space-between',
            gap: '12px',
            backgroundColor: '#ffffff'
          }}
        >
          {/* Left Flap / Details Side */}
          <div style={{ flex: '1.2', display: 'flex', flexDirection: 'column', justify: 'space-between', minWidth: 0 }}>
            {/* Line 1: G.Wt left, Design No right */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontWeight: '900', fontSize: '15px', color: '#000000', letterSpacing: '-0.3px' }}>
                G.Wt -{grossWtStr}
              </span>
              <span style={{ fontWeight: '900', fontSize: '15px', color: '#000000' }}>
                {designNo}
              </span>
            </div>

            {/* Line 2: Dia breakdown left, Karat right */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '2px' }}>
              <span style={{ fontWeight: '900', fontSize: '14px', color: '#000000', letterSpacing: '-0.3px' }}>
                {diaBreakupStr}
              </span>
              <span style={{ fontWeight: '900', fontSize: '14px', color: '#000000' }}>
                {karat}
              </span>
            </div>

            {/* Line 3: T.Dia right aligned under Karat */}
            <div style={{ textAlign: 'right', marginTop: '2px' }}>
              <span style={{ fontWeight: '900', fontSize: '13px', color: '#000000' }}>
                {totalDiaWtStr}
              </span>
            </div>
          </div>

          {/* Vertical Dotted Fold Line before Barcode */}
          <div
            style={{
              borderLeft: '2px dotted #000000',
              margin: '0 6px',
              alignSelf: 'stretch',
            }}
          />

          {/* Right Flap / Barcode & Code Side */}
          <div style={{ flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justify: 'center', paddingLeft: '4px', minWidth: 0 }}>
            {/* Barcode Strip */}
            <div style={{ width: '100%', height: '36px' }}>
              <BarcodeStrip code={skuCode} height={36} color="#000000" />
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '9px', fontWeight: '700', textAlign: 'center' }}>{skuCode || '—'}</div>

            {/* T.Dia Centered below Barcode */}
            {totalDiaWtStr && (
              <div style={{ fontWeight: '900', fontSize: '13px', color: '#000000', marginTop: '2px', textAlign: 'center' }}>
                {totalDiaWtStr}
              </div>
            )}

            {/* Design No / Code Centered at Bottom */}
            <div style={{ fontWeight: '900', fontSize: '17px', color: '#000000', marginTop: '2px', textAlign: 'center', letterSpacing: '0.5px' }}>
              {designNo}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
