import React from 'react';

export default function InventoryDeleteModal({ product, isOpen, onClose, onConfirm, deleting }) {
  if (!isOpen || !product) return null;

  const attrs = typeof product.attributes === 'string'
    ? (() => {
        try {
          return JSON.parse(product.attributes) || {};
        } catch {
          return {};
        }
      })()
    : (product.attributes || {});

  const productId = product.product_code || `RJ-D-${product.id}`;
  const categoryName = product.category?.name || attrs.category_name || 'Jewels';
  const purity = attrs.purity || attrs.gold_type || '22K Hallmark';
  const quality = attrs.quality || attrs.setting_style || (attrs.dia_wt_ct ? `${attrs.dia_wt_ct}ct Diamond` : 'VVS1 - E Color');
  const rawQty = product.current_stock_qty ?? attrs.stock_qty ?? product.opening_stock_qty ?? 1;
  const quantity = String(rawQty).padStart(2, '0');
  const weight = attrs.gross_wt || product.opening_stock_weight || 0;
  const formattedWeight = typeof weight === 'number'
    ? `${weight.toFixed(2)}g`
    : String(weight).includes('g') ? weight : `${parseFloat(weight || 0).toFixed(2)}g`;

  const imageSrc = product.thumbnail_url || product.image_url || product.image || (attrs.images && attrs.images[0]) || '/placeholder-jewelry.png';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      {/* Click outside backdrop to close */}
      <div className="fixed inset-0" onClick={onClose}></div>

      {/* Modal Container */}
      <div className="relative bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-stone-200/90 animate-in zoom-in-95 duration-150 font-['Inter',-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif]">

        {/* 1. Header with Warning Triangle and Close '✕' */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-triangle-exclamation text-[#b01622] text-sm shrink-0"></i>
            <h3 className="text-sm sm:text-[15px] font-bold text-[#b01622] tracking-tight">
              Delete Product Confirmation
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 transition-colors p-1 cursor-pointer"
            title="Close"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* 2. Explanatory Body Text */}
        <p className="text-xs text-stone-600 leading-relaxed mt-3.5 mb-4">
          Are you sure you want to delete this product? This action cannot be undone and will remove all associated stock data from the system.
        </p>

        {/* 3. Product Preview Card (Exact Match to Reference Image) */}
        <div className="bg-[#f9f9f9] rounded-2xl border border-stone-200/90 p-4 sm:p-5 flex items-center gap-4 sm:gap-6 my-4">
          
          {/* Left: Product Image */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-white border border-stone-200 shrink-0 shadow-2xs flex items-center justify-center">
            <img
              src={imageSrc}
              alt={product.name}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/placeholder-jewelry.png';
              }}
            />
          </div>

          {/* Right: 2-column Metadata Grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 min-w-0 flex-1 text-xs">
            {/* Row 1: Product ID & Category */}
            <div>
              <span className="block text-[10px] font-bold text-stone-400 tracking-wider uppercase">
                PRODUCT ID
              </span>
              <span className="font-bold text-[#b01622] font-mono text-xs block truncate mt-0.5">
                {productId}
              </span>
            </div>

            <div>
              <span className="block text-[10px] font-bold text-stone-400 tracking-wider uppercase">
                CATEGORY
              </span>
              <span className="font-semibold text-stone-800 text-xs block truncate mt-0.5">
                {categoryName}
              </span>
            </div>

            {/* Row 2: Purity & Quantity */}
            <div>
              <span className="block text-[10px] font-bold text-stone-400 tracking-wider uppercase">
                PURITY
              </span>
              <span className="font-semibold text-stone-800 text-xs block truncate mt-0.5">
                {purity}
              </span>
            </div>

            <div>
              <span className="block text-[10px] font-bold text-stone-400 tracking-wider uppercase">
                QUANTITY
              </span>
              <span className="font-semibold text-stone-800 text-xs block truncate mt-0.5">
                {quantity}
              </span>
            </div>

            {/* Row 3: Quality & Weight */}
            <div>
              <span className="block text-[10px] font-bold text-stone-400 tracking-wider uppercase">
                QUALITY
              </span>
              <span className="font-semibold text-stone-800 text-xs block truncate mt-0.5">
                {quality}
              </span>
            </div>

            <div>
              <span className="block text-[10px] font-bold text-stone-400 tracking-wider uppercase">
                WEIGHT
              </span>
              <span className="font-semibold text-stone-800 text-xs block truncate mt-0.5">
                {formattedWeight}
              </span>
            </div>
          </div>

        </div>

        {/* 4. Action Buttons matching Reference Image */}
        <div className="flex items-center justify-end gap-3 pt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-6 py-2.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="px-6 py-2.5 bg-[#7a0f19] hover:bg-[#600b13] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs disabled:opacity-50"
          >
            {deleting ? (
              <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
            ) : (
              <i className="fa-solid fa-trash-can text-xs"></i>
            )}
            <span>Delete Product</span>
          </button>
        </div>

      </div>
    </div>
  );
}
