import React from 'react';
import { cleanProductName } from '../utils/formatters';

export function BarcodeSvgLines({ code = '', height = 30, color = '#000000' }) {
  if (!code) return <svg width="100%" height={height} viewBox={`0 0 1 ${height}`} />;
  const bars = [];
  let x = 0;
  const seed = code.split('').map((c) => c.charCodeAt(0));
  for (let i = 0; i < 48; i++) {
    const cval = seed[i % seed.length];
    const w = (cval % 3) + 1.2;
    const gap = (cval % 2) + 1.1;
    bars.push({ x: Math.round(x * 10) / 10, w });
    x += w + gap;
  }
  const total = x;
  return (
    <svg width="100%" height={height} preserveAspectRatio="none" viewBox={`0 0 ${total} ${height}`}>
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={0} width={b.w} height={height} fill={color} />
      ))}
    </svg>
  );
}

export function generateBarcodeSvgString(code = '', height = 30, color = '#000000') {
  if (!code) return `<svg width="100%" height="${height}" viewBox="0 0 1 ${height}"></svg>`;
  const bars = [];
  let x = 0;
  const seed = code.split('').map((c) => c.charCodeAt(0));
  for (let i = 0; i < 48; i++) {
    const cval = seed[i % seed.length];
    const w = (cval % 3) + 1.2;
    const gap = (cval % 2) + 1.1;
    bars.push(`<rect x="${Math.round(x * 10) / 10}" y="0" width="${w}" height="${height}" fill="${color}" />`);
    x += w + gap;
  }
  const total = Math.round(x * 10) / 10;
  return `<svg width="100%" height="${height}" preserveAspectRatio="none" viewBox="0 0 ${total} ${height}">${bars.join('')}</svg>`;
}

export function formatTagDiamondSpec(piece) {
  const rawWeight =
    piece?.diamond_weight ??
    piece?.product?.attributes?.dia_wt_ct ??
    piece?.product?.attributes?.diamond_weight ??
    null;
  if (rawWeight == null || rawWeight === '') return '—';
  const wt = parseFloat(rawWeight).toFixed(2);

  // 2. Dynamic diamond count from piece or inventory product details
  let count = piece?.dynamic_dia_count;
  if (count === undefined || count === null) {
    if (piece?.diamond_count !== undefined && piece?.diamond_count !== null && piece?.diamond_count !== '') {
      count = parseInt(piece.diamond_count, 10);
    } else if (piece?.product?.attributes?.diamond_count !== undefined) {
      count = parseInt(piece.product.attributes.diamond_count, 10);
    } else if (piece?.product?.attributes?.dia_count !== undefined) {
      count = parseInt(piece.product.attributes.dia_count, 10);
    } else if (piece?.product?.attributes?.stone_count !== undefined) {
      count = parseInt(piece.product.attributes.stone_count, 10);
    } else if (Array.isArray(piece?.product?.attributes?.components)) {
      const diaComp = piece.product.attributes.components.find((c) => {
        const name = (c.category_name || c.item_name || '').toLowerCase();
        return name.includes('diamond') || name.includes('dia');
      });
      if (diaComp) {
        count = parseInt(diaComp.no_of_pieces || diaComp.quantity || 0, 10);
      }
    }
  }
  if (isNaN(count) || count === undefined || count === null) count = null;

  // 3. Dynamic stamp from inventory product details or piece
  let stamp = piece?.dynamic_stamp || piece?.diamond_stamp;
  if (!stamp) {
    stamp = piece?.product?.attributes?.stamp ||
      piece?.product?.stamp ||
      piece?.product?.attributes?.diamond_stamp ||
      piece?.stamp;
  }
  if (!stamp && Array.isArray(piece?.product?.attributes?.components)) {
    const diaComp = piece.product.attributes.components.find((c) => {
      const name = (c.category_name || c.item_name || '').toLowerCase();
      return (name.includes('diamond') || name.includes('dia')) && c.stamp;
    });
    if (diaComp?.stamp) {
      stamp = diaComp.stamp;
    }
  }
  if (!stamp && piece?.diamond_details) {
    // If diamond_details was saved with a stamp, extract it (e.g. Dia-0.09/+6/2 -> 6)
    const m = String(piece.diamond_details).match(/\/(\+?[A-Za-z0-9]+)\//);
    if (m && m[1] && m[1] !== '+7' && m[1] !== '7' && m[1] !== '+7U') {
      stamp = m[1];
    }
  }
  // Clean stamp format: ensure single leading '+'
  const cleanStamp = String(stamp).replace(/^\++/, '').trim();
  const stampStr = cleanStamp ? `+${cleanStamp}` : '—';

  return `Dia-${wt}/${stampStr}/${count ?? '—'}`;
}

export function formatTagTotalDia(piece) {
  const rawWeight =
    piece?.diamond_weight ??
    piece?.product?.attributes?.dia_wt_ct ??
    piece?.product?.attributes?.diamond_weight ??
    null;
  if (rawWeight == null || rawWeight === '') return '—';
  const wt = parseFloat(rawWeight).toFixed(2);
  return `${wt}Ct.`;
}

/**
 * Builds printable HTML for one or more tags matching exact specification:
 * Left: G.Wt, Design, Dia-spec, Karat, T.Dia
 * Right: Barcode -> Tag Number -> T.Dia -> Design No
 */
export function buildPrintableTagsHtml(items, title = 'Print Jewellery Tags') {
  const tagsHtml = items.map((piece) => {
    const grossWt = piece.gross_weight != null ? parseFloat(piece.gross_weight).toFixed(3) : '—';
    const designNo = piece.design_no || '—';
    const karat = piece.gold_karat || '—';
    const diaSpec = formatTagDiamondSpec(piece);
    const totalDia = formatTagTotalDia(piece);
    const tagNo = piece.tag_number || piece.product?.master_tag_number || piece.product?.product_code || '';
    const barcodeSvg = tagNo ? generateBarcodeSvgString(tagNo, 26) : '';

    return `
      <div class="tag-card">
        <!-- Left Specifications -->
        <div class="tag-left">
          <div class="tag-row row-1">
            <span class="gwt">G.Wt -${grossWt}</span>
            <span class="design-top">${designNo}</span>
          </div>
          <div class="tag-row row-2">
            <span class="dia-spec">${diaSpec}</span>
            <span class="karat">${karat}</span>
          </div>
          <div class="tag-row row-3">
            <span class="tdia-spec">T.Dia- ${totalDia}</span>
          </div>
        </div>

        <!-- Vertical Dotted Separation Line before Barcode -->
        <div class="tag-divider"></div>

        <!-- Right Barcode Section: Barcode -> Tag Number -> Total Dia -> Design No -->
        <div class="tag-right">
          <div class="barcode-box">
            ${barcodeSvg}
          </div>
          <div class="tag-no">
            ${tagNo || '—'}
          </div>
          <div class="tdia-barcode">
            T.Dia- ${totalDia}
          </div>
          <div class="design-bottom">
            ${designNo}
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title} (${items.length})</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      background: #ffffff;
      color: #000000;
      padding: 10px;
    }
    .tags-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: flex-start;
    }
    .tag-card {
      width: 105mm;
      height: 33mm;
      border: 2px solid #000000;
      border-radius: 4px;
      padding: 2.5mm 3.5mm;
      display: flex;
      align-items: stretch;
      justify-content: space-between;
      page-break-inside: avoid;
      background: #ffffff;
      color: #000000;
      box-sizing: border-box;
      margin-bottom: 6mm;
    }
    .tag-left {
      flex: 1.2;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding-right: 3mm;
      min-width: 0;
    }
    .tag-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      line-height: 1.1;
      white-space: nowrap;
    }
    .gwt {
      font-weight: 900;
      font-size: 15px;
      letter-spacing: -0.3px;
    }
    .design-top {
      font-weight: 900;
      font-size: 15px;
      text-transform: uppercase;
    }
    .dia-spec {
      font-weight: 900;
      font-size: 14px;
      letter-spacing: -0.3px;
    }
    .karat {
      font-weight: 900;
      font-size: 14px;
    }
    .row-3 {
      justify-content: flex-end;
    }
    .tdia-spec {
      font-weight: 900;
      font-size: 13px;
      text-align: right;
    }
    .tag-divider {
      border-left: 2px dotted #000000;
      margin: 0 2mm;
      align-self: stretch;
    }
    .tag-right {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      text-align: center;
      padding-left: 2.5mm;
      min-width: 0;
    }
    .barcode-box {
      width: 100%;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .tag-no {
      font-family: monospace;
      font-weight: 800;
      font-size: 8pt;
      color: #000000;
      letter-spacing: 0.4px;
      text-align: center;
      white-space: nowrap;
      margin-top: 1px;
    }
    .tdia-barcode {
      font-weight: 900;
      font-size: 8.5pt;
      color: #000000;
      text-align: center;
      white-space: nowrap;
      margin-top: 1px;
    }
    .design-bottom {
      font-weight: 900;
      font-size: 11pt;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #000000;
      white-space: nowrap;
      margin-top: 1px;
    }
    @media print {
      body {
        padding: 0;
        margin: 0;
        background: transparent;
      }
      .no-print {
        display: none !important;
      }
      .tags-container {
        gap: 0;
      }
      .tag-card {
        margin: 0 0 4mm 0;
        page-break-after: always;
      }
      @page {
        size: auto;
        margin: 4mm;
      }
    }
  </style>
</head>
<body>
  <div class="tags-container">
    ${tagsHtml}
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>`;
}

export default function JewelleryTagCard({ piece, id = 'jewellery-tag-card' }) {
  if (!piece) return null;

  const grossWt = piece.gross_weight != null ? parseFloat(piece.gross_weight).toFixed(3) : '—';
  const designNo = piece.design_no || '—';
  const karat = piece.gold_karat || '—';
  const diaSpec = formatTagDiamondSpec(piece);
  const totalDia = formatTagTotalDia(piece);
  const tagNo = piece.tag_number || piece.product?.master_tag_number || piece.product?.product_code || '—';

  return (
    <div
      id={id}
      className="tag-label-card bg-white text-black font-['Arial',Helvetica,sans-serif] select-none border-2 border-black rounded-sm shadow-md"
      style={{
        width: '105mm',
        minHeight: '33mm',
        maxHeight: '36mm',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'space-between',
        padding: '8px 10px',
        backgroundColor: '#ffffff',
        color: '#000000',
        pageBreakInside: 'avoid',
      }}
    >
      {/* Left Details Section */}
      <div
        className="tag-left-section"
        style={{
          flex: '1.2',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          paddingRight: '8px',
          minWidth: 0,
        }}
      >
        {/* Row 1: gross weight and design number */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontWeight: '900', fontSize: '15px', color: '#000000', letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>
            G.Wt -{grossWt}
          </span>
          <span style={{ fontWeight: '900', fontSize: '15px', color: '#000000', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            {designNo}
          </span>
        </div>

        {/* Row 2: Dia-0.09/+7U/3 (left), 22K (right) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '2px' }}>
          <span style={{ fontWeight: '900', fontSize: '14px', color: '#000000', letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>
            {diaSpec}
          </span>
          <span style={{ fontWeight: '900', fontSize: '14px', color: '#000000', whiteSpace: 'nowrap' }}>
            {karat}
          </span>
        </div>

        {/* Row 3: T.Dia- 0.09Ct. (right-aligned under 22K) */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'baseline', marginTop: '2px' }}>
          <span style={{ fontWeight: '900', fontSize: '13px', color: '#000000', whiteSpace: 'nowrap' }}>
            T.Dia- {totalDia}
          </span>
        </div>
      </div>

      {/* Dotted Separation Fold Line before Barcode */}
      <div
        className="tag-fold-dotted-divider"
        style={{
          borderLeft: '2px dotted #000000',
          margin: '0 6px',
          alignSelf: 'stretch',
        }}
      />

      {/* Right Barcode Section: Barcode -> Tag Number -> Total Dia -> Design No */}
      <div
        className="tag-right-section"
        style={{
          flex: '1',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: '6px',
          minWidth: 0,
          textAlign: 'center',
        }}
      >
        {/* 1. Barcode Strip */}
        <div style={{ width: '100%', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BarcodeSvgLines code={tagNo} height={26} color="#000000" />
        </div>

        {/* 2. Tag Number placed EXACTLY below the barcode */}
        <div
          style={{
            fontFamily: 'monospace',
            fontWeight: '800',
            fontSize: '10px',
            color: '#000000',
            letterSpacing: '0.4px',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            lineHeight: '1.2',
            marginTop: '1px',
          }}
        >
          {tagNo}
        </div>

        {/* 3. Then, Total Dia Value */}
        <div
          style={{
            fontWeight: '900',
            fontSize: '11.5px',
            color: '#000000',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            lineHeight: '1.2',
            marginTop: '1px',
          }}
        >
          T.Dia- {totalDia}
        </div>

        {/* 4. And then, Design No */}
        <div
          style={{
            textAlign: 'center',
            fontWeight: '900',
            fontSize: '15px',
            color: '#000000',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            lineHeight: '1.2',
            marginTop: '1px',
            whiteSpace: 'nowrap',
          }}
        >
          {designNo}
        </div>
      </div>
    </div>
  );
}
