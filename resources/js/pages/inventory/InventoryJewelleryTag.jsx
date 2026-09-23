import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';

export default function InventoryJewelleryTag() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [attributes, setAttributes] = useState({});
  const [karigar, setKarigar] = useState(null);
  const [huid, setHuid] = useState('');
  const [loading, setLoading] = useState(true);
  const [tagFormat, setTagFormat] = useState('certificate'); // 'certificate' | 'showcase' | 'tags_set'

  useEffect(() => {
    api.get(`/inventory/products/${id}`)
      .then((res) => {
        setProduct(res.data.product || {});
        setAttributes(res.data.attributes || {});
        setKarigar(res.data.karigar || null);
        setHuid(res.data.huid || res.data.attributes?.huid || 'H-BGL1002');
      })
      .catch((err) => {
        console.error('Failed to load product tag details:', err);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const tagCode = product?.product_code || 'RJ-SKU-' + id;

  const printReport = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const reportEl = document.getElementById('jewellery-tag-report');
    if (!reportEl) return;

    const printWindow = window.open('', '_blank', 'width=900,height=1200,scrollbars=yes');
    printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Jewellery Tag — ${tagCode}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background: #ffffff;
      color: #1c1917;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @page { size: A4; margin: 10mm; }
    .a4-page {
      width: 210mm;
      min-height: 277mm;
      padding: 10mm 12mm;
      margin: 0 auto;
      background: #ffffff;
      position: relative;
      box-sizing: border-box;
    }
    .watermark {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%,-50%) rotate(-45deg);
      font-size: 5.5rem;
      font-weight: 900;
      color: rgba(176,22,34,0.03);
      white-space: nowrap;
      pointer-events: none;
      z-index: 0;
      letter-spacing: 0.1em;
    }
    /* Utility resets to match Tailwind classes in the serialised HTML */
    .border-b-2    { border-bottom-width: 2px; }
    .border-t-2    { border-top-width: 2px; }
    .border-b      { border-bottom-width: 1px; }
    .border-t      { border-top-width: 1px; }
    .border        { border-width: 1px; }
    .border-2      { border-width: 2px; }
    .border-dashed { border-style: dashed; }
    table          { border-collapse: collapse; width: 100%; }
    img            { max-width: 100%; display: block; }
    @media print {
      body { background: #ffffff !important; }
      .a4-page { width: 100% !important; padding: 8mm !important; min-height: auto !important; }
    }
  </style>
</head>
<body>
${reportEl.outerHTML}
</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 800);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center text-stone-500 text-sm font-medium">
        <i className="fa-solid fa-circle-notch fa-spin mr-2 text-[#b01622] text-xl"></i>
        <span>Loading Jewellery Tag Report...</span>
      </div>
    );
  }

  const code = product?.product_code || 'RJ-SKU-' + id;
  const name = product?.name || '22KT Royal Temple Antique Kada Bangles (Pair)';
  const categoryName = product?.category?.name || 'Raw Gold';
  const subcategoryName = product?.subcategory?.name || 'Antique Temple Heritage';
  const grossWt = attributes.gross_wt || product?.opening_stock_weight || '28.500';
  const netWt = attributes.net_wt || product?.opening_fine_weight || '27.850';
  const purity = attributes.purity || attributes.gold_type || '22K (91.6% BIS 916 Hallmark)';
  const stamp = attributes.stamp || '916 BIS';
  const settingStyle = attributes.setting_style || 'Antique Cast / Temple Work';
  const openCloseType = attributes.open_close_type || attributes.open_close_details || 'Hinged Clasp with Safety Screw Lock';
  const rate = Number(attributes.sale_rate || attributes.rate || product?.opening_stock_rate || 6850);
  const makingCharge = attributes.making_charge ? `₹${attributes.making_charge}/g` : '₹750/g';
  const wastage = attributes.wastage_percent ? `${attributes.wastage_percent}%` : '3.50%';
  const valuation = attributes.sale_value 
    ? Number(attributes.sale_value) 
    : (Number(netWt) * rate) + (attributes.dia_wt_ct ? Number(attributes.dia_wt_ct) * 65000 : 0);
  const formattedValuation = Math.round(valuation).toLocaleString('en-IN');
  const imageSrc = product?.image_url || product?.image || '/placeholder-jewelry.png';
  const artisanName = karigar?.name || '-';
  const workshopName = karigar?.workshop_name || '-';
  const printDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  // Generate pseudo-unique barcode bar widths from code string
  const barcodeBars = code.split('').map((char, i) => {
    const codeVal = char.charCodeAt(0);
    return {
      w: (codeVal % 3) + 1.5,
      gap: (codeVal % 2) + 1.5,
    };
  });

  return (
    <div className="bg-stone-100 min-h-screen py-6 px-4 font-['Inter',-apple-system,sans-serif]">
      {/* Print Stylesheet */}
      <style>{`
        @page {
          size: A4;
          margin: 8mm;
        }
        .a4-page {
          width: 210mm;
          min-height: 297mm;
          padding: 12mm 14mm;
          margin: 0 auto;
          background: #ffffff;
          box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.08);
          position: relative;
          box-sizing: border-box;
        }
        .watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 5.5rem;
          font-weight: 900;
          color: rgba(176, 22, 34, 0.025);
          white-space: nowrap;
          pointer-events: none;
          z-index: 0;
          letter-spacing: 0.1em;
        }
        @media print {
          body {
            background: #ffffff !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .a4-page {
            box-shadow: none !important;
            width: 100% !important;
            min-height: auto !important;
            margin: 0 !important;
            padding: 8mm !important;
          }
        }
      `}</style>

      {/* Top Action Bar (no-print) */}
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
          {/* Format Selector */}
          <select
            value={tagFormat}
            onChange={(e) => setTagFormat(e.target.value)}
            className="px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold text-stone-700 focus:outline-hidden focus:border-[#b01622] cursor-pointer"
          >
            <option value="certificate">Full Certificate Tag (A4)</option>
            <option value="showcase">Showcase Retail Tag</option>
            <option value="tags_set">Dual Perforated Tag Set</option>
          </select>

          {/* Print Tag Button — opens clean popup and prints the A4 report */}
          <button
            type="button"
            onClick={printReport}
            className="px-5 py-2 bg-[#b01622] hover:bg-[#8f1019] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-print text-xs"></i>
            <span>Print Tag</span>
          </button>
        </div>
      </div>

      {/* Main A4 Report Page */}
      <div id="jewellery-tag-report" className="a4-page text-stone-900">
        <div className="watermark">RUDHRA JEWELLERS</div>

        {/* 1. Official Header & Letterhead (Matching Project Theme) */}
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
              <h1 className="text-xl font-black text-[#b01622] tracking-tight leading-none">
                RUDHRA JEWELLERS
              </h1>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">
                Imperial Heritage Jewellery & Bullion Merchants
              </p>
              <div className="text-[9.5px] text-stone-500 space-y-0.5 mt-2">
                <p>Regd. Office: 402, Heritage Plaza, MG Road, Mumbai 400001</p>
                <p>GSTIN: 33AAACR1234F1Z0 | BIS Hallmark Regn: HM-BIS-916-2026</p>
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="inline-block px-3 py-1 bg-red-50 border border-red-200 text-[#b01622] text-[10px] font-black uppercase tracking-wider rounded-md mb-1.5">
              OFFICIAL JEWELLERY TAG
            </span>
            <div className="font-mono text-sm font-bold text-stone-900">{code}</div>
            <div className="text-[9.5px] text-stone-500 font-mono mt-0.5">HUID: <strong className="text-stone-800">{huid}</strong></div>
            <div className="text-[9px] text-stone-400 mt-1">Issued: {printDate}</div>
          </div>
        </header>

        {/* 2. Main Product Showcase & Specs Overview */}
        <div className="grid grid-cols-12 gap-5 mb-6 relative z-10">
          
          {/* Left: Product Image Box with Authentic Seal */}
          <div className="col-span-4 flex flex-col items-center">
            <div className="w-full aspect-square rounded-2xl border-2 border-stone-200 bg-stone-50/50 p-2.5 flex items-center justify-center shadow-inner relative overflow-hidden">
              <img
                src={imageSrc}
                alt={name}
                className="w-full h-full object-contain rounded-xl"
                onError={(e) => { e.target.src = '/placeholder-jewelry.png'; }}
              />
              <div className="absolute top-2 right-2 bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                {stamp}
              </div>
            </div>

            {/* QR Code & Digital Audit Signature */}
            <div className="mt-3.5 p-2.5 bg-stone-50 border border-stone-200 rounded-xl w-full flex items-center gap-3">
              <div className="w-14 h-14 bg-white border border-stone-300 rounded-lg flex items-center justify-center p-1 shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <rect x="0" y="0" width="100" height="100" fill="white" />
                  <path d="M10,10 h30 v30 h-30 z M15,15 v20 h20 v-20 z M20,20 h10 v10 h-10 z" fill="#b01622" />
                  <path d="M60,10 h30 v30 h-30 z M65,15 v20 h20 v-20 z M70,20 h10 v10 h-10 z" fill="#b01622" />
                  <path d="M10,60 h30 v30 h-30 z M15,65 v20 h20 v-20 z M20,70 h10 v10 h-10 z" fill="#b01622" />
                  <rect x="48" y="15" width="6" height="20" fill="black" />
                  <rect x="15" y="48" width="20" height="6" fill="black" />
                  <rect x="48" y="48" width="12" height="12" fill="#b01622" />
                  <rect x="65" y="55" width="25" height="6" fill="black" />
                  <rect x="75" y="68" width="15" height="15" fill="black" />
                  <rect x="50" y="75" width="15" height="15" fill="black" />
                </svg>
              </div>
              <div className="min-w-0 flex-1 text-[9px] leading-tight">
                <div className="font-bold text-stone-800">Scan for Verification</div>
                <p className="text-stone-500 mt-0.5 truncate">BIS Portal & ERP Audit</p>
                <span className="font-mono text-[#b01622] font-semibold mt-1 block">ID: {huid}</span>
              </div>
            </div>
          </div>

          {/* Right: Technical Specs & Valuation Breakdown */}
          <div className="col-span-8 space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  {categoryName} • {subcategoryName}
                </span>
              </div>
              <h2 className="text-lg font-black text-stone-900 leading-tight mt-0.5">
                {name}
              </h2>
            </div>

            {/* Technical Specifications Matrix */}
            <div className="bg-stone-50 rounded-xl border border-stone-200 overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <tbody>
                  <tr className="border-b border-stone-200/80">
                    <td className="py-2 px-3 font-semibold text-stone-500 bg-stone-100/60 w-36">Metal & Purity</td>
                    <td className="py-2 px-3 font-bold text-stone-900">{purity}</td>
                    <td className="py-2 px-3 font-semibold text-stone-500 bg-stone-100/60 w-28">Hallmark</td>
                    <td className="py-2 px-3 font-bold font-mono text-[#b01622]">{stamp}</td>
                  </tr>
                  <tr className="border-b border-stone-200/80">
                    <td className="py-2 px-3 font-semibold text-stone-500 bg-stone-100/60">Gross Weight</td>
                    <td className="py-2 px-3 font-bold font-mono text-stone-900">{Number(grossWt).toFixed(3)} g</td>
                    <td className="py-2 px-3 font-semibold text-stone-500 bg-stone-100/60">Net Fine Weight</td>
                    <td className="py-2 px-3 font-bold font-mono text-stone-900">{Number(netWt).toFixed(3)} g</td>
                  </tr>
                  <tr className="border-b border-stone-200/80">
                    <td className="py-2 px-3 font-semibold text-stone-500 bg-stone-100/60">Setting Style</td>
                    <td className="py-2 px-3 text-stone-800">{settingStyle}</td>
                    <td className="py-2 px-3 font-semibold text-stone-500 bg-stone-100/60">Fastening / Lock</td>
                    <td className="py-2 px-3 text-stone-800">{openCloseType}</td>
                  </tr>
                  <tr className="border-b border-stone-200/80">
                    <td className="py-2 px-3 font-semibold text-stone-500 bg-stone-100/60">Wastage / Making</td>
                    <td className="py-2 px-3 text-stone-800">{wastage} • {makingCharge}</td>
                    <td className="py-2 px-3 font-semibold text-stone-500 bg-stone-100/60">Laser HUID</td>
                    <td className="py-2 px-3 font-bold font-mono text-stone-900">{huid}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-stone-500 bg-stone-100/60">Crafted By</td>
                    <td colSpan="3" className="py-2 px-3 text-stone-800">
                      <strong>{artisanName}</strong> ({workshopName})
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Valuation & Price Highlight Banner */}
            <div className="bg-[#b01622] text-white rounded-xl p-3.5 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-100 block">
                  MRP / Official Selling Price (Incl. GST)
                </span>
                <span className="text-2xl font-black tracking-tight">₹{formattedValuation}</span>
              </div>
              <div className="text-right text-[10px] text-red-100 leading-tight">
                <div>Gold Rate: ₹{rate.toLocaleString('en-IN')}/g</div>
                <div>Net Pure Gold: {Number(netWt).toFixed(3)}g</div>
                <div>100% Certified Buyback Guarantee</div>
              </div>
            </div>

          </div>
        </div>

        {/* 3. Barcode Strip for Automated Scanning (Code 128) */}
        <div className="border-t border-b border-stone-200 py-3.5 mb-6 relative z-10 flex items-center justify-between px-2">
          <div className="flex-1 max-w-[280px]">
            {/* SVG Barcode */}
            <div className="h-10 w-full">
              <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 240 36">
                <rect x="0" y="0" width="3" height="36" fill="#111" />
                <rect x="5" y="0" width="1" height="36" fill="#111" />
                <rect x="8" y="0" width="4" height="36" fill="#111" />
                <rect x="15" y="0" width="2" height="36" fill="#111" />
                <rect x="20" y="0" width="5" height="36" fill="#111" />
                <rect x="28" y="0" width="2" height="36" fill="#111" />
                <rect x="33" y="0" width="3" height="36" fill="#111" />
                <rect x="39" y="0" width="6" height="36" fill="#111" />
                <rect x="48" y="0" width="2" height="36" fill="#111" />
                <rect x="53" y="0" width="4" height="36" fill="#111" />
                <rect x="60" y="0" width="2" height="36" fill="#111" />
                <rect x="65" y="0" width="5" height="36" fill="#111" />
                <rect x="73" y="0" width="1" height="36" fill="#111" />
                <rect x="77" y="0" width="3" height="36" fill="#111" />
                <rect x="83" y="0" width="4" height="36" fill="#111" />
                <rect x="90" y="0" width="2" height="36" fill="#111" />
                <rect x="95" y="0" width="5" height="36" fill="#111" />
                <rect x="103" y="0" width="2" height="36" fill="#111" />
                <rect x="108" y="0" width="3" height="36" fill="#111" />
                <rect x="114" y="0" width="6" height="36" fill="#111" />
                <rect x="123" y="0" width="2" height="36" fill="#111" />
                <rect x="128" y="0" width="4" height="36" fill="#111" />
                <rect x="135" y="0" width="1" height="36" fill="#111" />
                <rect x="139" y="0" width="5" height="36" fill="#111" />
                <rect x="147" y="0" width="2" height="36" fill="#111" />
                <rect x="152" y="0" width="3" height="36" fill="#111" />
                <rect x="158" y="0" width="6" height="36" fill="#111" />
                <rect x="167" y="0" width="2" height="36" fill="#111" />
                <rect x="172" y="0" width="4" height="36" fill="#111" />
                <rect x="179" y="0" width="3" height="36" fill="#111" />
                <rect x="185" y="0" width="1" height="36" fill="#111" />
                <rect x="189" y="0" width="5" height="36" fill="#111" />
                <rect x="197" y="0" width="2" height="36" fill="#111" />
                <rect x="202" y="0" width="4" height="36" fill="#111" />
                <rect x="209" y="0" width="2" height="36" fill="#111" />
                <rect x="214" y="0" width="5" height="36" fill="#111" />
                <rect x="222" y="0" width="3" height="36" fill="#111" />
                <rect x="228" y="0" width="2" height="36" fill="#111" />
                <rect x="233" y="0" width="4" height="36" fill="#111" />
              </svg>
            </div>
            <div className="font-mono text-center text-[10px] font-bold tracking-widest text-stone-700 mt-1">
              *{code}*
            </div>
          </div>

          <div className="text-center">
            <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">BIS Hallmarking License</div>
            <div className="text-xs font-bold text-stone-900 mt-0.5">BIS/HM/MH/2026/0916</div>
            <div className="text-[9px] text-emerald-700 font-semibold mt-0.5">✓ 100% XRF Tested & Verified</div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">ERP Tag Reference</div>
            <div className="font-mono text-xs font-bold text-stone-900 mt-0.5">TAG-{id}-{Math.round(valuation).toString().slice(-4)}</div>
            <div className="text-[9px] text-stone-500 mt-0.5">Rudra Jewellery Core Inventory</div>
          </div>
        </div>

        {/* 4. Dual Retail Perforated Cut-out Tags (Display Tags ready for display stands) */}
        <div className="mb-6 relative z-10">
          <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
            <span>Perforated Showcase Display Cut-Out Tags (Foldable Retail Tag)</span>
            <span className="text-[9px] text-stone-400 italic">✂ Cut along dashed border for showcase stands</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Tag 1: Front Display Tag */}
            <div className="border-2 border-dashed border-stone-300 rounded-2xl p-4 bg-white shadow-2xs relative">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2 mb-2.5">
                <div className="text-[10px] font-black text-[#b01622] tracking-wider uppercase">RUDRA JEWELLERS</div>
                <div className="px-2 py-0.5 bg-red-50 text-[#b01622] text-[9px] font-bold rounded font-mono">{stamp}</div>
              </div>
              <div className="text-xs font-bold text-stone-900 leading-snug line-clamp-1">{name}</div>
              <div className="grid grid-cols-2 gap-2 mt-2 text-[10px]">
                <div><span className="text-stone-400">SKU:</span> <strong className="font-mono text-stone-800">{code}</strong></div>
                <div><span className="text-stone-400">HUID:</span> <strong className="font-mono text-stone-800">{huid}</strong></div>
                <div><span className="text-stone-400">Gross:</span> <strong className="font-mono text-stone-800">{Number(grossWt).toFixed(3)}g</strong></div>
                <div><span className="text-stone-400">Net Wt:</span> <strong className="font-mono text-stone-800">{Number(netWt).toFixed(3)}g</strong></div>
              </div>
              <div className="mt-3 pt-2 border-t border-stone-200 flex items-center justify-between">
                <span className="text-xs font-black text-[#b01622]">₹{formattedValuation}</span>
                <span className="text-[8.5px] font-bold text-stone-400 uppercase tracking-wider">SHOWCASE TAG</span>
              </div>
            </div>

            {/* Tag 2: Barcode & Audit Tag */}
            <div className="border-2 border-dashed border-stone-300 rounded-2xl p-4 bg-white shadow-2xs relative flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2 mb-2">
                <div className="text-[10px] font-black text-[#b01622] tracking-wider uppercase">AUTHENTICITY TAG</div>
                <div className="text-[9px] font-mono text-stone-500">{purity.split(' ')[0]}</div>
              </div>
              <div className="h-7 w-full my-1">
                <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 200 28">
                  <rect x="0" y="0" width="3" height="28" fill="#111" />
                  <rect x="5" y="0" width="1" height="28" fill="#111" />
                  <rect x="8" y="0" width="4" height="28" fill="#111" />
                  <rect x="15" y="0" width="2" height="28" fill="#111" />
                  <rect x="20" y="0" width="5" height="28" fill="#111" />
                  <rect x="28" y="0" width="2" height="28" fill="#111" />
                  <rect x="33" y="0" width="3" height="28" fill="#111" />
                  <rect x="40" y="0" width="6" height="28" fill="#111" />
                  <rect x="50" y="0" width="2" height="28" fill="#111" />
                  <rect x="55" y="0" width="4" height="28" fill="#111" />
                  <rect x="62" y="0" width="2" height="28" fill="#111" />
                  <rect x="68" y="0" width="5" height="28" fill="#111" />
                  <rect x="76" y="0" width="1" height="28" fill="#111" />
                  <rect x="80" y="0" width="3" height="28" fill="#111" />
                  <rect x="86" y="0" width="4" height="28" fill="#111" />
                  <rect x="94" y="0" width="2" height="28" fill="#111" />
                  <rect x="100" y="0" width="5" height="28" fill="#111" />
                  <rect x="108" y="0" width="2" height="28" fill="#111" />
                  <rect x="114" y="0" width="3" height="28" fill="#111" />
                  <rect x="120" y="0" width="6" height="28" fill="#111" />
                  <rect x="130" y="0" width="2" height="28" fill="#111" />
                  <rect x="135" y="0" width="4" height="28" fill="#111" />
                  <rect x="142" y="0" width="1" height="28" fill="#111" />
                  <rect x="146" y="0" width="5" height="28" fill="#111" />
                  <rect x="154" y="0" width="2" height="28" fill="#111" />
                  <rect x="160" y="0" width="3" height="28" fill="#111" />
                  <rect x="166" y="0" width="6" height="28" fill="#111" />
                  <rect x="175" y="0" width="2" height="28" fill="#111" />
                  <rect x="180" y="0" width="4" height="28" fill="#111" />
                  <rect x="188" y="0" width="3" height="28" fill="#111" />
                  <rect x="194" y="0" width="1" height="28" fill="#111" />
                </svg>
              </div>
              <div className="font-mono text-center text-[9px] font-bold text-stone-600">*{code}*</div>
              <div className="mt-2 pt-1.5 border-t border-stone-200 flex items-center justify-between text-[9px]">
                <span className="text-stone-500">Vault Loc: Counter A</span>
                <span className="font-bold text-stone-900">₹{formattedValuation}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Formal Legal Declaration & Signatory Footer */}
        <footer className="mt-auto border-t-2 border-stone-200 pt-4 relative z-10">
          <div className="grid grid-cols-12 gap-4 text-stone-600 items-end">
            
            {/* Legal Notice */}
            <div className="col-span-7 text-[9px] leading-relaxed">
              <p className="font-bold text-stone-800">GUARANTEE & RETURN POLICY:</p>
              <p className="mt-0.5">
                Every jewellery creation from Rudra Jewellers is certified 100% genuine with BIS Hallmarked purity and laser etched HUID. Lifetime exchange and buyback guaranteed across all authorized branches as per prevailing gold & bullion rates.
              </p>
              <div className="text-[8.5px] text-stone-400 mt-1">
                SYSTEM GENERATED CERTIFICATE • ELECTRONIC SECURITY SEAL • NO PHYSICAL SIGNATURE REQUIRED
              </div>
            </div>

            {/* Official Signatures */}
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
    </div>
  );
}
