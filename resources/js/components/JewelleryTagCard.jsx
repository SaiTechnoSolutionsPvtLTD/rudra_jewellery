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

export function isMetalPurityStamp(val) {
  if (!val) return false;
  const str = String(val).trim().toLowerCase().replace(/^\++/, '');
  // Metal purities like 916, 24, 22, 18, 14, 24k, 22k, 18k, 750, 14k, 585, 925, 999, etc.
  return /^(?:24k?|22k?|18k?|14k?|10k?|916|750|585|925|999|99\.9|hallmark|bis|gold|silver|platinum)/i.test(str)
    || /\b(916|750|585|925|999|22k?|24k?|18k?|14k?)\b/i.test(str);
}

export function isDiamondComponent(c) {
  if (!c) return false;
  if (c.is_diamond === true || c.component_type === 'diamond' || c.material_type === 'diamond') return true;
  const name = String(c.category_name || c.item_name || c.component_type || c.type || c.name || '').toLowerCase().trim();
  if (name.includes('diamond cut') || name.includes('diamond-cut')) return false;
  return name.includes('diamond') || name.includes('solitaire') || /\bdia\b/.test(name) || /\bc-dia\b/.test(name);
}

export function getParsedDiamondList(piece) {
  if (!piece) return [];

  // 1. Check piece.diamond_sieves
  let rawList = piece.diamond_sieves;

  // 2. Check piece.qc_submission_data?.diamond_sieves
  if (!rawList || !Array.isArray(rawList) || rawList.length === 0) {
    if (piece.qc_submission_data && Array.isArray(piece.qc_submission_data.diamond_sieves)) {
      rawList = piece.qc_submission_data.diamond_sieves;
    }
  }

  // 3. Check piece.item?.stone_details
  if (!rawList || !Array.isArray(rawList) || rawList.length === 0) {
    let sd = piece.item?.stone_details || piece.stone_details;
    if (typeof sd === 'string' && sd.trim().startsWith('[')) {
      try { sd = JSON.parse(sd); } catch (_) {}
    }
    if (Array.isArray(sd) && sd.length > 0) {
      rawList = sd;
    }
  }

  // 4. Check piece.item?.diamond_sieves
  if (!rawList || !Array.isArray(rawList) || rawList.length === 0) {
    if (piece.item && Array.isArray(piece.item.diamond_sieves)) {
      rawList = piece.item.diamond_sieves;
    }
  }

  // 5. Check components on product attributes
  if (!rawList || !Array.isArray(rawList) || rawList.length === 0) {
    const allComponents = [
      ...(Array.isArray(piece?.product?.attributes?.components) ? piece.product.attributes.components : []),
      ...(Array.isArray(piece?.components) ? piece.components : []),
      ...(Array.isArray(piece?.item?.components) ? piece.item.components : []),
    ];
    const diaComps = allComponents.filter(isDiamondComponent);
    if (diaComps.length > 0) {
      rawList = diaComps.map((c) => ({
        stamp: c.stamp || c.sieve || '0',
        count: c.no_of_pieces || c.quantity || c.count || 0,
        weight: c.weight || c.carats || c.diamond_weight || 0,
      }));
    }
  }

  let parsed = [];
  if (Array.isArray(rawList) && rawList.length > 0) {
    parsed = rawList
      .map((item) => {
        if (!item) return null;
        let stamp = item.stamp || item.sieve || item.diamond_stamp || '';
        if (isMetalPurityStamp(stamp)) stamp = '0';
        let cleanStamp = String(stamp).replace(/^\++/, '').trim();
        if (!cleanStamp) cleanStamp = '0';
        const formattedStamp = cleanStamp.startsWith('-')
          ? cleanStamp
          : (cleanStamp === '0' ? '+0' : `+${cleanStamp}`);

        const count = parseInt(item.count ?? item.pieces ?? item.no_of_diamonds ?? item.quantity ?? 0, 10) || 0;
        const weight = parseFloat(item.weight ?? item.carats ?? item.diamond_weight ?? 0) || 0;

        return {
          stamp: formattedStamp,
          rawStamp: cleanStamp,
          count,
          weight,
        };
      })
      .filter((item) => item && (item.rawStamp !== '0' || item.count > 0 || item.weight > 0));
  }

  // 6. Check if diamond_details string has pattern like "Dia-0.90/+3/4"
  if (parsed.length === 0 && piece.diamond_details && typeof piece.diamond_details === 'string') {
    const match = piece.diamond_details.match(/Dia-([0-9.]+)\/(\+?[A-Za-z0-9_-]+)\/([0-9]+)/i);
    if (match) {
      const wt = parseFloat(match[1]) || 0;
      let st = match[2].replace(/^\++/, '').trim();
      if (isMetalPurityStamp(st)) st = '0';
      const formattedStamp = st.startsWith('-') ? st : (st === '0' ? '+0' : `+${st}`);
      const cnt = parseInt(match[3], 10) || 0;
      if (wt > 0 || cnt > 0 || st !== '0') {
        parsed.push({
          stamp: formattedStamp,
          rawStamp: st,
          count: cnt,
          weight: wt,
        });
      }
    }
  }

  // 7. Fallback to piece's primary diamond fields if still empty
  if (parsed.length === 0) {
    const wt = parseFloat(piece?.diamond_weight ?? piece?.product?.attributes?.dia_wt_ct ?? 0) || 0;
    const cnt = parseInt(piece?.diamond_count ?? piece?.dynamic_dia_count ?? piece?.product?.attributes?.diamond_count ?? 0, 10) || 0;
    let st = piece?.diamond_stamp || piece?.dynamic_stamp || '0';
    if (isMetalPurityStamp(st)) st = '0';
    let cleanSt = String(st).replace(/^\++/, '').trim();
    if (!cleanSt) cleanSt = '0';
    const formattedStamp = cleanSt.startsWith('-') ? cleanSt : (cleanSt === '0' ? '+0' : `+${cleanSt}`);

    if (wt > 0 || cnt > 0 || cleanSt !== '0') {
      parsed.push({
        stamp: formattedStamp,
        rawStamp: cleanSt,
        count: cnt,
        weight: wt,
      });
    }
  }

  return parsed;
}

export function getOverallDiamondTotals(piece) {
  const diaList = getParsedDiamondList(piece);
  if (diaList.length > 0) {
    const totalWt = diaList.reduce((acc, s) => acc + (parseFloat(s.weight) || 0), 0);
    const totalCount = diaList.reduce((acc, s) => acc + (parseInt(s.count, 10) || 0), 0);
    return {
      list: diaList,
      totalWeight: totalWt,
      totalCount: totalCount,
      totalDiaString: `${totalWt.toFixed(2)}Ct.`,
    };
  }

  const rawWt = parseFloat(piece?.diamond_weight ?? piece?.product?.attributes?.dia_wt_ct ?? 0) || 0;
  const rawCnt = parseInt(piece?.diamond_count ?? piece?.dynamic_dia_count ?? 0, 10) || 0;
  return {
    list: [],
    totalWeight: rawWt,
    totalCount: rawCnt,
    totalDiaString: `${rawWt.toFixed(2)}Ct.`,
  };
}

export function formatTagDiamondLines(piece) {
  const diaList = getParsedDiamondList(piece);
  if (diaList.length === 0) {
    return ['+0/0/0.00'];
  }

  // Display up to 3 individual diamond lines formatted like +3/4/0.9
  const lines = diaList.slice(0, 3).map((item) => {
    let cleanStamp = item.rawStamp || '0';
    if (!cleanStamp || cleanStamp === '0' || cleanStamp === '+0') {
      cleanStamp = '0';
    }
    const stampStr = cleanStamp.startsWith('+') || cleanStamp.startsWith('-')
      ? cleanStamp
      : (cleanStamp === '0' ? '+0' : `+${cleanStamp}`);

    const count = parseInt(item.count, 10) || 0;
    const wtNum = parseFloat(item.weight) || 0;

    let wtStr = '0.00';
    if (wtNum > 0) {
      wtStr = wtNum.toFixed(3);
      wtStr = wtStr.replace(/(\.[0-9]*[1-9])0+$/, '$1').replace(/\.000$/, '.0');
    }

    return `${stampStr}/${count}/${wtStr}`;
  });

  return lines.length > 0 ? lines : ['+0/0/0.00'];
}

export function formatTagDiamondSpec(piece) {
  const lines = formatTagDiamondLines(piece);
  return lines[0] || '+0/0/0.00';
}

export function formatTagTotalDia(piece) {
  const { totalWeight } = getOverallDiamondTotals(piece);
  if (totalWeight <= 0) {
    return '0.00Ct.';
  }
  return `${totalWeight.toFixed(2)}Ct.`;
}

/**
 * Builds printable HTML for one or more tags matching exact specification:
 * Left: G.Wt (top left), Design No (top right), up to 3 dia lines like +3/4/0.9, Karat (aligned with 1st line), T.Dia (bottom left)
 * Right: Barcode -> Tag Number -> Design No -> Total Dia
 */
export function buildPrintableTagsHtml(items, title = 'Print Jewellery Tags') {
  const tagsHtml = items.map((piece) => {
    const grossWt = piece.gross_weight != null ? parseFloat(piece.gross_weight).toFixed(3) : '—';
    const designNo = piece.design_no || '—';
    const karat = piece.gold_karat || '—';
    const diaList = getParsedDiamondList(piece);
    const diaLines = formatTagDiamondLines(piece);
    const totalDia = formatTagTotalDia(piece);
    const hasMoreDiamonds = diaList.length > 3;
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

          <!-- Diamond details section: up to 3 diff dia details like +3/4/0.9 -->
          <div class="dia-section">
            <div class="tag-row dia-row">
              <span class="dia-spec">${diaLines[0]}</span>
              <span class="karat">${karat}</span>
            </div>
            ${diaLines.length > 1 ? `
            <div class="tag-row dia-row">
              <span class="dia-spec">${diaLines[1]}</span>
            </div>` : ''}
            ${diaLines.length > 2 ? `
            <div class="tag-row dia-row">
              <span class="dia-spec">${diaLines[2]}</span>
            </div>` : ''}
            ${hasMoreDiamonds ? `
            <div class="tag-row dia-row dia-dots-row">
              <span class="dia-spec dia-dots">....</span>
            </div>` : ''}
          </div>

          <div class="tag-row row-3">
            <span class="tdia-spec">T.Dia- ${totalDia}</span>
          </div>
        </div>

        <!-- Vertical Dotted Separation Line before Barcode -->
        <div class="tag-divider"></div>

        <!-- Right Barcode Section: Barcode -> Tag Number -> Design No -> Total Dia -->
        <div class="tag-right">
          <div class="barcode-box">
            ${barcodeSvg}
          </div>
          <div class="tag-no">
            ${tagNo || '—'}
          </div>
          <div class="design-bottom">
            ${designNo}
          </div>
          <div class="tdia-barcode">
            T.Dia- ${totalDia}
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title></title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      background: #ffffff;
      color: #000000;
      padding: 10mm 12mm;
    }
    .tags-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: flex-start;
    }
    .tag-card {
      width: 125mm;
      height: 38mm;
      border: 2px solid #000000;
      border-radius: 4px;
      padding: 2.5mm 4mm;
      display: flex;
      align-items: stretch;
      justify-content: space-between;
      page-break-inside: avoid;
      background: #ffffff;
      color: #000000;
      box-sizing: border-box;
      margin-bottom: 6mm;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .tag-left {
      flex: 1.35;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding-right: 4mm;
      min-width: 0;
    }
    .tag-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      line-height: 1.1;
      white-space: nowrap;
      gap: 3mm;
    }
    .gwt {
      font-weight: 900;
      font-size: 15px;
      letter-spacing: -0.3px;
      flex-shrink: 0;
    }
    .design-top {
      font-weight: 900;
      font-size: 14px;
      text-transform: uppercase;
      text-align: right;
      letter-spacing: -0.2px;
    }
    .dia-section {
      display: flex;
      flex-direction: column;
      gap: 1.5px;
      margin: 1px 0;
      justify-content: center;
    }
    .dia-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      line-height: 1.15;
    }
    .dia-spec {
      font-weight: 900;
      font-size: 13.5px;
      letter-spacing: -0.2px;
      flex-shrink: 0;
      font-family: Arial, Helvetica, sans-serif;
    }
    .karat {
      font-weight: 900;
      font-size: 14px;
      text-align: right;
    }
    .row-3 {
      justify-content: flex-start;
    }
    .tdia-spec {
      font-weight: 900;
      font-size: 13px;
      text-align: left;
    }
    .dia-dots-row {
      line-height: 0.8;
      margin-top: -1px;
      margin-bottom: 0px;
    }
    .dia-dots {
      font-weight: 900;
      font-size: 14px;
      letter-spacing: 2px;
      font-family: Arial, Helvetica, sans-serif;
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
    .tdia-barcode {
      font-weight: 900;
      font-size: 8.5pt;
      color: #000000;
      text-align: center;
      white-space: nowrap;
      margin-top: 1px;
    }
    @page {
      size: auto;
      margin: 0 !important;
    }
    @media print {
      body {
        padding: 10mm 12mm !important;
        margin: 0 !important;
        background: transparent !important;
      }
      .no-print {
        display: none !important;
      }
      .tags-container {
        gap: 0;
      }
      .tag-card {
        height: 38mm;
        margin: 0 0 6mm 0;
        page-break-after: always;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      @page {
        size: auto;
        margin: 0 !important;
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
      try {
        document.title = "";
      } catch (e) {}
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
  const diaList = getParsedDiamondList(piece);
  const diaLines = formatTagDiamondLines(piece);
  const totalDia = formatTagTotalDia(piece);
  const hasMoreDiamonds = diaList.length > 3;
  const tagNo = piece.tag_number || piece.product?.master_tag_number || piece.product?.product_code || '—';

  return (
    <div
      id={id}
      className="tag-label-card bg-white text-black font-['Arial',Helvetica,sans-serif] select-none border-2 border-black rounded-sm shadow-md"
      style={{
        width: '125mm',
        minHeight: '38mm',
        maxHeight: '42mm',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'space-between',
        padding: '8px 12px',
        backgroundColor: '#ffffff',
        color: '#000000',
        pageBreakInside: 'avoid',
      }}
    >
      {/* Left Details Section */}
      <div
        className="tag-left-section"
        style={{
          flex: '1.35',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          paddingRight: '12px',
          minWidth: 0,
        }}
      >
        {/* Row 1: gross weight and design number */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ fontWeight: '900', fontSize: '15px', color: '#000000', letterSpacing: '-0.3px', whiteSpace: 'nowrap', flexShrink: 0 }}>
            G.Wt -{grossWt}
          </span>
          <span style={{ fontWeight: '900', fontSize: '14px', color: '#000000', textTransform: 'uppercase', whiteSpace: 'nowrap', textAlign: 'right', letterSpacing: '-0.2px' }}>
            {designNo}
          </span>
        </div>

        {/* Diamond details section: up to 3 diff dia details like +3/4/0.9 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', margin: '2px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontWeight: '900', fontSize: '13.5px', color: '#000000', letterSpacing: '-0.2px', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {diaLines[0]}
            </span>
            <span style={{ fontWeight: '900', fontSize: '14px', color: '#000000', whiteSpace: 'nowrap', textAlign: 'right' }}>
              {karat}
            </span>
          </div>
          {diaLines.length > 1 && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'baseline' }}>
              <span style={{ fontWeight: '900', fontSize: '13.5px', color: '#000000', letterSpacing: '-0.2px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {diaLines[1]}
              </span>
            </div>
          )}
          {diaLines.length > 2 && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'baseline' }}>
              <span style={{ fontWeight: '900', fontSize: '13.5px', color: '#000000', letterSpacing: '-0.2px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {diaLines[2]}
              </span>
            </div>
          )}
          {hasMoreDiamonds && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'baseline', lineHeight: '0.8', marginTop: '-1px', marginBottom: '0' }}>
              <span style={{ fontWeight: '900', fontSize: '14px', color: '#000000', letterSpacing: '2px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                ....
              </span>
            </div>
          )}
        </div>

        {/* Row 3: T.Dia- {totalDia} (left-aligned below dia details) */}
        <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'baseline', marginTop: '1px' }}>
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

      {/* Right Barcode Section: Barcode -> Tag Number -> Design No -> Total Dia */}
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

        {/* 3. Then, Design No */}
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

        {/* 4. And then, Total Dia Value */}
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
      </div>
    </div>
  );
}
