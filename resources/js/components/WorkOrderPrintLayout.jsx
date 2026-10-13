import React from 'react';

export function WorkOrderPrintHeader({ title, number, issuedDate }) {
  return (
    <div className="flex items-center justify-between border-b-2 border-[#881337] pb-3">
      <div>
        <h1 className="text-xl font-black text-[#881337] tracking-wide uppercase">RUDHRA JEWELLERS</h1>
        <p className="text-[10px] text-gray-600 uppercase font-bold tracking-wider mt-0.5">Heritage Gold, Diamond &amp; Fine Jewellery Crafts</p>
        <p className="text-[10px] text-gray-500 mt-1">Plot No 14, Usman Road, T. Nagar, Chennai - 600017 | GSTIN: 33AAAAA0000A1Z5 | Phone: +91 98765 43210</p>
      </div>
      <div className="text-right">
        <h2 className="text-lg font-black text-[#881337]">{title}</h2>
        <span className="font-mono font-bold text-xs bg-rose-50 border border-rose-200 text-[#881337] px-2.5 py-1 rounded inline-block mt-1">
          {number || '—'}
        </span>
        <p className="text-[10px] text-gray-500 mt-1">Issued Date: {issuedDate || '—'}</p>
      </div>
    </div>
  );
}

export function WorkOrderPrintMetadata({ items }) {
  return (
    <div className="grid grid-cols-5 gap-2 bg-[#fdfbf7] p-3 rounded-lg border border-[#eedfce] text-[10px]">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <span className="text-stone-400 font-bold block uppercase text-[9px]">{item.label}</span>
          <span className={`font-bold block break-words ${item.valueClassName || 'text-gray-900'}`}>
            {item.value ?? '—'}
          </span>
        </div>
      ))}
    </div>
  );
}