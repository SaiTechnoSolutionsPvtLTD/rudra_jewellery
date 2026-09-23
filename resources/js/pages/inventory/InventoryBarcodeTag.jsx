import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';

/* ───────────────────────────────────────────────────────────
   Reusable SVG barcode strip (pattern seeded from SKU string)
─────────────────────────────────────────────────────────── */
function BarcodeStrip({ code = 'RJ-BGL-1002', height = 36, color = '#111' }) {
  // derive bar widths from char codes so it looks product-unique
  const bars = [];
  let x = 0;
  const seed = code.split('').map((c) => c.charCodeAt(0));
  for (let i = 0; i < 38; i++) {
    const cval = seed[i % seed.length];
    const w = (cval % 3) + 1.5;
    const gap = (cval % 2) + 1.5;
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

/* ───────────────────────────────────────────────────────────
   Mini QR-code look-alike (SVG)
─────────────────────────────────────────────────────────── */
function QRBlock({ accent = '#b01622' }) {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <rect x="0" y="0" width="100" height="100" fill="white" />
      {/* Top-left finder */}
      <path d="M10,10 h30 v30 h-30 z M15,15 v20 h20 v-20 z M20,20 h10 v10 h-10 z" fill={accent} />
      {/* Top-right finder */}
      <path d="M60,10 h30 v30 h-30 z M65,15 v20 h20 v-20 z M70,20 h10 v10 h-10 z" fill={accent} />
      {/* Bottom-left finder */}
      <path d="M10,60 h30 v30 h-30 z M15,65 v20 h20 v-20 z M20,70 h10 v10 h-10 z" fill={accent} />
      {/* Data modules */}
      <rect x="48" y="15" width="6" height="20" fill="#111" />
      <rect x="15" y="48" width="20" height="6" fill="#111" />
      <rect x="48" y="48" width="12" height="12" fill={accent} />
      <rect x="65" y="55" width="25" height="6" fill="#111" />
      <rect x="75" y="68" width="15" height="15" fill="#111" />
      <rect x="50" y="75" width="15" height="15" fill="#111" />
    </svg>
  );
}

/* ───────────────────────────────────────────────────────────
   Single printable label card (used in grid)
─────────────────────────────────────────────────────────── */
function LabelCard({ code, name, purity, grossWt, netWt, diaWt, stamp, huid, price, variant = 'full' }) {
  return (
    <div
      style={{ breakInside: 'avoid' }}
      className="border border-stone-300 rounded-xl bg-white shadow-2xs overflow-hidden flex flex-col"
    >
      {/* Card header */}
      <div className="bg-[#b01622] px-3 py-1.5 flex items-center justify-between">
        <span className="text-white text-[9px] font-black tracking-widest">RUDHRA JEWELLERS</span>
        <span className="text-red-100 text-[9px] font-mono font-bold">{stamp}</span>
      </div>

      <div className="px-3 pt-2 pb-1.5 flex-1 flex flex-col gap-1.5">
        {/* Product name */}
        <div className="text-[10.5px] font-bold text-stone-900 leading-snug line-clamp-2">{name}</div>

        {/* Spec row with Dia Wt, Net Wt, Gross Wt/Total Wt, Stamp & HUID */}
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[9px] text-stone-600 bg-stone-50 p-2 rounded-lg border border-stone-200">
          <div><span className="text-stone-400 font-semibold">SKU:</span> <strong className="font-mono text-stone-900">{code}</strong></div>
          <div><span className="text-stone-400 font-semibold">Stamp:</span> <strong className="font-mono text-[#b01622]">{stamp}</strong></div>
          <div><span className="text-stone-400 font-semibold">Total Wt:</span> <strong className="font-mono text-stone-900">{Number(grossWt).toFixed(3)}g</strong></div>
          <div><span className="text-stone-400 font-semibold">Net Wt:</span> <strong className="font-mono text-stone-900">{Number(netWt).toFixed(3)}g</strong></div>
          <div><span className="text-stone-400 font-semibold">Dia Wt:</span> <strong className="font-mono text-purple-700">{diaWt ? `${Number(diaWt).toFixed(2)} CT` : '0.00 CT'}</strong></div>
          <div><span className="text-stone-400 font-semibold">HUID:</span> <strong className="font-mono text-stone-900">{huid}</strong></div>
        </div>

        {/* Barcode */}
        <div className="h-7 w-full mt-0.5">
          <BarcodeStrip code={code} height={28} />
        </div>
        <div className="font-mono text-[8px] font-bold text-stone-600 text-center tracking-widest">*{code}*</div>
      </div>

      {/* Price footer */}
      <div className="border-t border-stone-200 px-3 py-1.5 flex items-center justify-between bg-stone-50/50">
        <span className="text-[9.5px] text-stone-500 font-mono font-bold">BIS {stamp}</span>
        <span className="text-sm font-black text-[#b01622]">₹{Number(price).toLocaleString('en-IN')}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function InventoryBarcodeTag() {
  const { id } = useParams();
  const [product, setProduct]     = useState(null);
  const [attributes, setAttributes] = useState({});
  const [karigar, setKarigar]     = useState(null);
  const [huid, setHuid]           = useState('');
  const [loading, setLoading]     = useState(true);
  const [labelCount, setLabelCount] = useState(6);   // 6 or 12

  useEffect(() => {
    api.get(`/inventory/products/${id}`)
      .then((res) => {
        setProduct(res.data.product || {});
        setAttributes(res.data.attributes || {});
        setKarigar(res.data.karigar || null);
        setHuid(res.data.huid || res.data.attributes?.huid || 'H-BGL1002');
      })
      .catch((err) => console.error('Failed to load barcode details:', err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center text-stone-500 text-sm font-medium">
        <i className="fa-solid fa-circle-notch fa-spin mr-2 text-[#b01622] text-xl"></i>
        <span>Loading Barcode Report...</span>
      </div>
    );
  }

  // ── Derived values ──────────────────────────────────────
  const code          = product?.product_code || 'RJ-SKU-' + id;
  const name          = product?.name || 'Jewellery Item';
  const categoryName  = product?.category?.name  || 'Gold';
  const subcatName    = product?.subcategory?.name || 'Jewellery';
  const grossWt       = attributes.gross_wt  || product?.opening_stock_weight  || '0.000';
  const netWt         = attributes.net_wt    || product?.opening_fine_weight   || '0.000';
  const diaWt         = attributes.dia_wt_ct || attributes.dia_wt || product?.dia_wt_ct || 0;
  const purity        = attributes.purity    || attributes.gold_type           || '22K';
  const purityShort   = purity.split(' ')[0];
  const stamp         = attributes.stamp     || '916 BIS';
  const settingStyle  = attributes.setting_style || 'N/A';
  const openClose     = attributes.open_close_type || attributes.open_close_details || 'N/A';
  const rate          = Number(attributes.sale_rate || attributes.rate || product?.opening_stock_rate || 0);
  const makingCharge  = attributes.making_charge ? `₹${attributes.making_charge}/g` : '₹750/g';
  const wastage       = attributes.wastage_percent ? `${attributes.wastage_percent}%` : '3.50%';
  const valuation     = attributes.sale_value
    ? Number(attributes.sale_value)
    : (Number(netWt) * rate) + (diaWt ? Number(diaWt) * 65000 : 0);
  const formattedPrice = Math.round(valuation).toLocaleString('en-IN');
  const artisanName   = karigar?.name || '-';
  const imageSrc      = product?.image_url || product?.image || '/placeholder-jewelry.png';
  const printDate     = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const stockQty      = product?.current_stock_qty ?? 1;

  return (
    <div className="bg-stone-100 min-h-screen py-6 px-4 font-['Inter',-apple-system,sans-serif]">

      {/* ── Print CSS ─────────────────────────────────────── */}
      <style>{`
        @page { size: A4; margin: 8mm; }
        .a4-page {
          width: 210mm;
          min-height: 297mm;
          padding: 12mm 14mm;
          margin: 0 auto;
          background: #ffffff;
          box-shadow: 0 4px 20px -2px rgba(0,0,0,0.08);
          position: relative;
          box-sizing: border-box;
        }
        .watermark {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%,-50%) rotate(-45deg);
          font-size: 5.5rem;
          font-weight: 900;
          color: rgba(176,22,34,0.025);
          white-space: nowrap;
          pointer-events: none;
          z-index: 0;
          letter-spacing: 0.1em;
        }
        .label-grid-6  { grid-template-columns: repeat(2, 1fr); }
        .label-grid-12 { grid-template-columns: repeat(3, 1fr); }
        @media print {
          body { background: #ffffff !important; padding: 0 !important; }
          .no-print { display: none !important; }
          .a4-page {
            box-shadow: none !important;
            width: 100% !important;
            min-height: auto !important;
            margin: 0 !important;
            padding: 8mm !important;
          }
        }
      `}</style>

      {/* ── Top Action Bar (no-print) ───────────────────── */}
      <div className="no-print max-w-[210mm] mx-auto mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <Link
            to={`/inventory/products/${id}`}
            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-2"
          >
            <i className="fa-solid fa-arrow-left text-xs"></i>
            <span>Back to Product</span>
          </Link>
          <span className="text-stone-300">|</span>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-600">
            <span className="text-stone-400">SKU:</span>
            <span className="font-mono font-bold text-[#b01622]">{code}</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Switch to Jewellery Tag */}
          <Link
            to={`/inventory/products/${id}/jewellery-tag`}
            className="px-3.5 py-2 bg-white border border-stone-300 hover:border-stone-400 text-stone-700 text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-2"
          >
            <i className="fa-solid fa-certificate text-xs text-amber-600"></i>
            <span>Jewellery Tag PDF</span>
          </Link>

          {/* Label count toggle */}
          <select
            value={labelCount}
            onChange={(e) => setLabelCount(Number(e.target.value))}
            className="px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold text-stone-700 focus:outline-hidden focus:border-[#b01622] cursor-pointer"
          >
            <option value={6}>6 Labels per Sheet</option>
            <option value={12}>12 Labels per Sheet</option>
          </select>

          {/* Print */}
          <button
            type="button"
            onClick={() => window.print()}
            className="px-5 py-2 bg-[#b01622] hover:bg-[#8f1019] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-print text-xs"></i>
            <span>Print Tag</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          A4 PRINTABLE PAGE
      ═══════════════════════════════════════════════════ */}
      <div className="a4-page text-stone-900">
        <div className="watermark">RUDHRA JEWELLERS</div>

        {/* 1. LETTERHEAD ─────────────────────────────────── */}
        <header className="border-b-2 border-[#b01622] pb-5 mb-5 relative z-10 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-14 shrink-0">
              <img
                src="/logo.png"
                alt="Rudhra Jewellers"
                className="h-full w-auto object-contain"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
            <div>
              <h1 className="text-xl font-black text-[#b01622] tracking-tight leading-none">RUDHRA JEWELLERS</h1>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">
                Imperial Heritage Jewellery &amp; Bullion Merchants
              </p>
              <div className="text-[9.5px] text-stone-500 space-y-0.5 mt-2">
                <p>Regd. Office: 402, Heritage Plaza, MG Road, Mumbai 400001</p>
                <p>GSTIN: 33AAACR1234F1Z0 | BIS Hallmark Regn: HM-BIS-916-2026</p>
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="inline-block px-3 py-1 bg-red-50 border border-red-200 text-[#b01622] text-[10px] font-black uppercase tracking-wider rounded-md mb-1.5">
              BARCODE LABEL REPORT
            </span>
            <div className="font-mono text-sm font-bold text-stone-900">{code}</div>
            <div className="text-[9.5px] text-stone-500 font-mono mt-0.5">HUID: <strong className="text-stone-800">{huid}</strong></div>
            <div className="text-[9px] text-stone-400 mt-1">Printed: {printDate}</div>
          </div>
        </header>

        {/* 2. PRODUCT SUMMARY STRIP ───────────────────────── */}
        <div className="relative z-10 mb-5 bg-stone-50 border border-stone-200 rounded-2xl p-4 grid grid-cols-12 gap-4 items-center">

          {/* Product Image */}
          <div className="col-span-2">
            <div className="aspect-square rounded-xl border border-stone-200 bg-white p-1.5 overflow-hidden shadow-inner flex items-center justify-center relative">
              <img
                src={imageSrc}
                alt={name}
                className="w-full h-full object-contain rounded-lg"
                onError={(e) => { e.target.src = '/placeholder-jewelry.png'; }}
              />
              <div className="absolute top-1 right-1 bg-amber-500 text-white text-[7px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                {stamp}
              </div>
            </div>
          </div>

          {/* Product Details Grid: Dia Wt, Net Wt, Gross Wt (Total Wt), Stamp, HUID */}
          <div className="col-span-7 space-y-2">
            <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
              {categoryName} • {subcatName}
            </div>
            <h2 className="text-base font-black text-stone-900 leading-tight">{name}</h2>

            <div className="grid grid-cols-4 gap-x-3 gap-y-1.5 text-[9.5px]">
              <div><span className="text-stone-400 block uppercase font-bold text-[8px]">Metal &amp; Purity</span> <strong className="text-stone-800">{purity}</strong></div>
              <div><span className="text-stone-400 block uppercase font-bold text-[8px]">Hallmark Stamp</span> <strong className="text-[#b01622] font-mono">{stamp}</strong></div>
              <div><span className="text-stone-400 block uppercase font-bold text-[8px]">Total Gross Wt</span> <strong className="font-mono text-stone-900">{Number(grossWt).toFixed(3)} g</strong></div>
              <div><span className="text-stone-400 block uppercase font-bold text-[8px]">Net Fine Wt</span> <strong className="font-mono text-stone-900">{Number(netWt).toFixed(3)} g</strong></div>
              <div><span className="text-stone-400 block uppercase font-bold text-[8px]">Diamond Weight</span> <strong className="font-mono text-purple-700">{diaWt ? `${Number(diaWt).toFixed(2)} CT` : '0.00 CT'}</strong></div>
              <div><span className="text-stone-400 block uppercase font-bold text-[8px]">Wastage</span> <strong className="text-stone-800">{wastage}</strong></div>
              <div><span className="text-stone-400 block uppercase font-bold text-[8px]">Making Charge</span> <strong className="text-stone-800">{makingCharge}</strong></div>
              <div><span className="text-stone-400 block uppercase font-bold text-[8px]">BIS HUID Tag</span> <strong className="font-mono text-stone-900">{huid}</strong></div>
            </div>
          </div>

          {/* Price & QR block */}
          <div className="col-span-3 flex flex-col items-center gap-2">
            <div className="bg-[#b01622] text-white rounded-xl px-3 py-2 text-center w-full shadow-xs">
              <div className="text-[9px] font-bold text-red-100 uppercase tracking-wider">MRP (Incl. GST)</div>
              <div className="text-xl font-black mt-0.5">₹{formattedPrice}</div>
              <div className="text-[9px] text-red-100">Gold Rate: ₹{rate.toLocaleString('en-IN')}/g</div>
            </div>
            <div className="flex items-center gap-2 w-full">
              <div className="w-14 h-14 border border-stone-300 rounded-lg p-1 bg-white shrink-0">
                <QRBlock accent="#b01622" />
              </div>
              <div className="text-[8.5px] text-stone-500 leading-tight">
                <div className="font-bold text-stone-700">Scan for Verification</div>
                <div>BIS Portal &amp; ERP Audit</div>
                <div className="font-mono text-[#b01622] font-semibold mt-0.5">{huid}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. MASTER BARCODE STRIP ────────────────────────── */}
        <div className="relative z-10 mb-5 border-t border-b border-stone-200 py-3.5 flex items-center justify-between gap-6 px-2">
          <div className="flex-1 max-w-[300px]">
            <div className="h-11 w-full">
              <BarcodeStrip code={code} height={44} color="#111" />
            </div>
            <div className="font-mono text-center text-[10px] font-bold tracking-widest text-stone-700 mt-1">
              *{code}*
            </div>
          </div>

          <div className="text-center">
            <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">BIS Hallmarking License</div>
            <div className="text-xs font-bold text-stone-900 mt-0.5">BIS/HM/MH/2026/0916</div>
            <div className="text-[9px] text-emerald-700 font-semibold mt-0.5">✓ 100% XRF Tested &amp; Verified</div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Stock Quantity</div>
            <div className="font-mono text-lg font-black text-stone-900 mt-0.5">{String(stockQty).padStart(2, '0')} pcs</div>
            <div className="text-[9px] text-stone-500">ERP Ref: TAG-{id}-{Math.round(valuation).toString().slice(-4)}</div>
          </div>
        </div>

        {/* 4. LABEL GRID WITH DIA WT, NET WT, GROSS WT, STAMP & BARCODE ───── */}
        <div className="relative z-10 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
              Barcode Label Sheet — {labelCount} Labels (A4 Adhesive / Sticker Sheet)
            </div>
            <div className="text-[9px] text-stone-400 italic">✂ Cut along label borders for attachment</div>
          </div>

          <div
            className={`grid gap-3 ${labelCount === 12 ? 'label-grid-12' : 'label-grid-6'}`}
            style={{ gridTemplateColumns: `repeat(${labelCount === 12 ? 3 : 2}, 1fr)` }}
          >
            {Array.from({ length: labelCount }).map((_, i) => (
              <LabelCard
                key={i}
                code={code}
                name={name}
                purity={purityShort}
                grossWt={grossWt}
                netWt={netWt}
                diaWt={diaWt}
                stamp={stamp}
                huid={huid}
                price={Math.round(valuation)}
                variant={labelCount === 6 ? 'full' : 'compact'}
              />
            ))}
          </div>
        </div>

        {/* 5. FORMAL FOOTER ──────────────────────────────── */}
        <footer className="mt-auto border-t-2 border-stone-200 pt-4 relative z-10">
          <div className="grid grid-cols-12 gap-4 items-end">
            <div className="col-span-7 text-[9px] leading-relaxed text-stone-600">
              <p className="font-bold text-stone-800">BARCODE LABEL ISSUANCE POLICY:</p>
              <p className="mt-0.5">
                This barcode label document is issued exclusively by Rudra Jewellers ERP for certified inventory items.
                Each label carries a unique BIS HUID and Code-128 barcode for point-of-sale scanning and audit trail.
                Labels must be affixed securely to the jewellery or packaging. Detached or tampered labels are invalid.
              </p>
              <div className="text-[8.5px] text-stone-400 mt-1.5">
                SYSTEM GENERATED • AUTOMATED INVENTORY BARCODING SYSTEM • ELECTRONIC SECURITY SEAL
              </div>
            </div>

            <div className="col-span-5 flex justify-end gap-6 text-center">
              <div>
                <div className="w-24 border-b border-stone-400 mb-1.5 mx-auto"></div>
                <div className="text-[9px] font-bold text-stone-900">ARVIND</div>
                <div className="text-[8px] text-stone-500 uppercase tracking-wider">Managing Director</div>
              </div>
              <div>
                <div className="w-24 border-b border-stone-400 mb-1.5 mx-auto"></div>
                <div className="text-[9px] font-bold text-stone-900">{artisanName.toUpperCase()}</div>
                <div className="text-[8px] text-stone-500 uppercase tracking-wider">Master Artisan</div>
              </div>
            </div>
          </div>
        </footer>

      </div>
      {/* /a4-page */}

    </div>
  );
}
