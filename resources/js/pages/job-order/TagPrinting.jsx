import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../../services/api';
import JewelleryTagCard, { buildPrintableTagsHtml, BarcodeSvgLines } from '../../components/JewelleryTagCard';
import { cleanProductName } from '../../utils/formatters';
import Pagination from '../../components/Pagination';

export default function TagPrinting() {
  const [searchParams] = useSearchParams();
  const initialWo = searchParams.get('wo') || '';
  const initialTag = searchParams.get('tag') || '';

  const [searchQuery, setSearchQuery] = useState(initialTag || initialWo || '');
  const [pieces, setPieces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [activePreviewPiece, setActivePreviewPiece] = useState(null);
  const [previewCopies, setPreviewCopies] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchTags = async (q = '') => {
    setCurrentPage(1);
    setLoading(true);
    try {
      const res = await api.get('/work-orders/tags', {
        params: { search: q }
      });
      const data = res.data?.data || [];
      setPieces(data);
      setSelectedIds((current) => current.filter((id) => data.some((piece) => piece.id === id)));
      if (initialTag && data.length > 0) {
        const found = data.find(p => p.tag_number === initialTag);
        if (found) setActivePreviewPiece(found);
      }
    } catch (err) {
      console.error('Failed to load tags:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags(searchQuery);
  }, []);

  const handleSearch = (e) => {
    e?.preventDefault();
    setCurrentPage(1);
    fetchTags(searchQuery);
  };

  const totalPages = Math.max(1, Math.ceil(pieces.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const pagePieces = pieces.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds((current) => Array.from(new Set([...current, ...pagePieces.map((piece) => piece.id)])));
    } else {
      setSelectedIds((current) => current.filter((id) => !pagePieces.some((piece) => piece.id === id)));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const printSingleTag = (piece) => {
    printTagsHtml([piece]);
  };

  const printSelectedTags = () => {
    const selectedPieces = pieces.filter(p => selectedIds.includes(p.id));
    if (selectedPieces.length === 0) return;
    printTagsHtml(selectedPieces);
  };

  const printTagsHtml = (items) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes');
    if (!printWindow) return;

    const htmlContent = buildPrintableTagsHtml(items, 'Print Jewellery Tags');
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="p-6 bg-stone-50 min-h-screen">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-stone-900 tracking-tight">Tag Printing</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#b01622]/10 text-[#b01622]">
              {loading ? 'Loading tags…' : `${pieces.length} Tags Generated`}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Search, preview, and print official barcodes and jewelry tags for individually received physical pieces.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/job-order/receive"
            className="px-4 py-2 bg-white border border-stone-200 text-stone-700 text-xs font-bold rounded-lg hover:bg-stone-50 transition-colors flex items-center gap-2 shadow-xs"
          >
            <i className="fa-solid fa-arrow-left"></i>
            <span>Receive Work Order</span>
          </Link>
          {selectedIds.length > 0 && (
            <button
              onClick={printSelectedTags}
              className="px-5 py-2 bg-[#b01622] text-white text-xs font-bold rounded-lg hover:bg-[#8f1019] transition-colors flex items-center gap-2 shadow-sm"
            >
              <i className="fa-solid fa-print"></i>
              <span>Print Selected ({selectedIds.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs mb-6">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs"></i>
            <input
              type="text"
              placeholder="Search by Tag Number (e.g. TAG-2026-000001), Work Order No, or Design No..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-medium text-stone-900 focus:outline-none focus:border-[#b01622] transition-colors"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 bg-stone-900 text-white text-xs font-bold rounded-lg hover:bg-black transition-colors flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-magnifying-glass"></i>
            <span>Search</span>
          </button>
          <button
            type="button"
            onClick={() => fetchTags(searchQuery)}
            className="px-4 py-2.5 bg-white border border-stone-200 text-stone-700 text-xs font-bold rounded-lg hover:bg-stone-50 transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
            title="Refresh tags list"
          >
            <i className="fa-solid fa-arrows-rotate text-stone-500"></i>
            <span>Refresh</span>
          </button>
          {searchQuery && (
            <button
              type="button"
              onClick={() => { setSearchQuery(''); fetchTags(''); }}
              className="px-4 py-2.5 bg-stone-100 text-stone-600 text-xs font-bold rounded-lg hover:bg-stone-200 transition-colors"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-stone-400 text-xs font-medium flex items-center justify-center gap-2">
            <i className="fa-solid fa-circle-notch animate-spin text-sm text-[#b01622]"></i>
            <span>Loading jewelry tags...</span>
          </div>
        ) : pieces.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-3 text-lg">
              <i className="fa-solid fa-tag"></i>
            </div>
            <h3 className="text-sm font-bold text-stone-800">No Jewellery Tags Found</h3>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              Physical pieces receive a unique tag when received in the "Receive Work Order" page.
            </p>
            <Link
              to="/job-order/receive"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-[#b01622] text-white text-xs font-bold rounded-lg hover:bg-[#8f1019]"
            >
              Go to Receive Work Order
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={pagePieces.length > 0 && pagePieces.every((piece) => selectedIds.includes(piece.id))}
                      onChange={handleSelectAll}
                      className="rounded border-stone-300 text-[#b01622] focus:ring-[#b01622]"
                    />
                  </th>
                  <th className="p-3">Tag Number</th>
                  <th className="p-3">Work Order</th>
                  <th className="p-3">Design No</th>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">Karigar</th>
                  <th className="p-3 text-right">Gross Wt</th>
                  <th className="p-3 text-right">Net Gold</th>
                  <th className="p-3 text-center">Touch (Purity)</th>
                  <th className="p-3 text-right">Pure 24K</th>
                  <th className="p-3 text-center">Certification</th>
                  <th className="p-3 text-center">Hallmarking</th>
                  <th className="p-3">Received At</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                {pagePieces.map((piece) => {
                  const isSelected = selectedIds.includes(piece.id);
                  const certStatus = (piece.certification_status || '').toLowerCase();
                  const isCertCompleted = certStatus === 'completed';
                  const isCertSkipped = certStatus === 'skipped' || certStatus === 'not_required';

                  const hallStatus = (piece.hallmarking_status || '').toLowerCase();
                  const isHallCompleted = hallStatus === 'completed';
                  const isHallSkipped = hallStatus === 'skipped' || hallStatus === 'not_required';

                  return (
                    <tr
                      key={piece.id}
                      className={`hover:bg-amber-50/40 transition-colors ${isSelected ? 'bg-amber-50/60' : ''}`}
                    >
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(piece.id)}
                          className="rounded border-stone-300 text-[#b01622] focus:ring-[#b01622]"
                        />
                      </td>
                      <td className="p-3 whitespace-nowrap text-left align-middle">
                        <div className="flex flex-col items-start gap-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded font-mono font-bold text-xs text-stone-900 bg-stone-100 border border-stone-200">
                            {piece.tag_number}
                          </span>
                          <span className="text-[10px] text-stone-400 font-medium pl-0.5">Piece #{piece.piece_number}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Link
                          to={`/job-order/${piece.work_order_id}/details`}
                          className="font-bold text-[#b01622] hover:underline"
                        >
                          {piece.work_order?.work_order_number || `WO-${piece.work_order_id}`}
                        </Link>
                      </td>
                      <td className="p-3 font-semibold text-stone-800">
                        {piece.design_no || '-'}
                      </td>
                      <td className="p-3 max-w-xs truncate" title={cleanProductName(piece.product_name, piece.design_no)}>
                        {piece.product_id ? (
                          <Link to={`/inventory/products/${piece.product_id}`} className="hover:text-[#b01622] font-semibold underline text-stone-800">
                            {cleanProductName(piece.product_name, piece.design_no)}
                          </Link>
                        ) : (
                          <span className="font-semibold text-stone-800">
                            {cleanProductName(piece.product_name, piece.design_no)}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-stone-600">
                        {piece.karigar?.name || piece.work_order?.karigar_name || '-'}
                      </td>
                      <td className="p-3 text-right font-bold text-stone-900">
                        {parseFloat(piece.gross_weight || 0).toFixed(3)}g
                      </td>
                      <td className="p-3 text-right font-semibold text-amber-700">
                        {parseFloat(piece.net_gold_weight || 0).toFixed(3)}g
                      </td>
                      <td className="p-3 text-center font-bold text-stone-700">
                        {parseFloat(piece.purity || 91.6).toFixed(1)}%
                      </td>
                      <td className="p-3 text-right font-bold text-amber-900">
                        {parseFloat(piece.pure_24k_weight || 0).toFixed(3)}g
                      </td>
                      {/* Certification Column */}
                      <td className="p-3 text-center">
                        {isCertSkipped ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold text-stone-500 bg-stone-100 border border-stone-200">
                            Skipped
                          </span>
                        ) : isCertCompleted ? (
                          <div className="text-[11px] font-mono">
                            <span className="font-bold text-stone-900 block">
                              {piece.certificate_no || 'Completed'}
                            </span>
                            {piece.certification_agency && (
                              <span className="text-[10px] text-stone-500 block truncate max-w-[130px] mx-auto">
                                {piece.certification_agency}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-stone-400 font-bold">-</span>
                        )}
                      </td>
                      {/* Hallmarking Column */}
                      <td className="p-3 text-center">
                        {isHallSkipped ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold text-stone-500 bg-stone-100 border border-stone-200">
                            Skipped
                          </span>
                        ) : isHallCompleted ? (
                          <div className="text-[11px] font-mono">
                            <span className="font-bold text-stone-900 block">
                              {piece.huid || 'Completed'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-stone-400 font-bold">-</span>
                        )}
                      </td>
                      <td className="p-3 text-stone-500 text-[11px] whitespace-nowrap">
                        {piece.received_at ? new Date(piece.received_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setActivePreviewPiece(piece)}
                            className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded text-xs font-bold transition-colors"
                            title="Preview Tag"
                          >
                            <i className="fa-solid fa-eye"></i>
                          </button>
                          <button
                            type="button"
                            onClick={() => printSingleTag(piece)}
                            className="px-3 py-1 bg-[#b01622] hover:bg-[#8f1019] text-white rounded text-xs font-bold transition-colors flex items-center gap-1"
                            title="Print this Tag"
                          >
                            <i className="fa-solid fa-print"></i>
                            <span>Print</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && pieces.length > 0 && (
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={pieces.length}
            itemsPerPage={itemsPerPage}
            onPageChange={(page) => setCurrentPage(page)}
            onItemsPerPageChange={(num) => {
              setItemsPerPage(num);
              setCurrentPage(1);
            }}
          />
        )}
      </div>

      {/* Preview Modal */}
      {activePreviewPiece && (
        <div className="fixed inset-0 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-stone-200 overflow-hidden my-auto flex flex-col">
            {/* Header */}
            <div className="px-5 py-3.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between no-print">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-[#b01622] flex items-center justify-center text-sm border border-red-100">
                  <i className="fa-solid fa-tags"></i>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-xs sm:text-sm">
                    Jewellery Tag Printing — {activePreviewPiece.tag_number || '—'}
                  </h3>
                  <p className="text-[10px] text-stone-500 font-mono">
                    {activePreviewPiece.product_name || activePreviewPiece.design_no || 'Jewellery Piece'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-stone-100 px-2.5 py-1 rounded-xl border border-stone-200 text-xs">
                  <span className="text-[10.5px] text-stone-500 font-semibold">Copies:</span>
                  <select
                    value={previewCopies}
                    onChange={(e) => setPreviewCopies(Number(e.target.value))}
                    className="bg-white border border-stone-300 rounded-lg px-2 py-0.5 text-xs font-bold text-stone-800 focus:outline-none"
                  >
                    {[1, 2, 3, 4, 5, 10].map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? 'tag' : 'tags'}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const items = Array.from({ length: Math.max(1, previewCopies) }, () => activePreviewPiece);
                    printTagsHtml(items);
                  }}
                  className="px-3.5 py-1.5 bg-[#b01622] hover:bg-[#8f1019] text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <i className="fa-solid fa-print text-xs"></i>
                  <span>Print {previewCopies > 1 ? `${previewCopies} Tags` : 'Tag'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActivePreviewPiece(null);
                    setPreviewCopies(1);
                  }}
                  className="w-7 h-7 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-600 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <i className="fa-solid fa-xmark text-xs"></i>
                </button>
              </div>
            </div>

            {/* Tag Preview Area */}
            <div className="p-6 bg-stone-100/70 flex flex-col items-center justify-center gap-3 overflow-x-auto">
              <JewelleryTagCard piece={activePreviewPiece} id="active-tag-preview" />
              <span className="text-[11px] text-stone-400 text-center">
                Dotted line indicates physical fold crease before barcode label. Tag dimensions: 105mm × 33mm.
              </span>
            </div>

            {/* Data Mapping Summary Table */}
            <div className="p-4 bg-white border-t border-stone-200 text-xs space-y-2">
              <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider block">
                Tag Specifications Summary
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                <div className="bg-stone-50 p-2 rounded-xl border border-stone-100">
                  <span className="text-stone-400 block text-[9.5px] font-semibold uppercase">Tag Number</span>
                  <span className="font-mono font-bold text-stone-900">{activePreviewPiece.tag_number || '—'}</span>
                </div>
                <div className="bg-stone-50 p-2 rounded-xl border border-stone-100">
                  <span className="text-stone-400 block text-[9.5px] font-semibold uppercase">Design No</span>
                  <span className="font-mono font-bold text-stone-900">{activePreviewPiece.design_no || '—'}</span>
                </div>
                <div className="bg-stone-50 p-2 rounded-xl border border-stone-100">
                  <span className="text-stone-400 block text-[9.5px] font-semibold uppercase">Gross Weight</span>
                  <span className="font-mono font-bold text-[#b01622]">
                    {activePreviewPiece.gross_weight != null ? `${Number(activePreviewPiece.gross_weight).toFixed(3)}g` : '—'}
                  </span>
                </div>
                <div className="bg-stone-50 p-2 rounded-xl border border-stone-100">
                  <span className="text-stone-400 block text-[9.5px] font-semibold uppercase">Purity / Karat</span>
                  <span className="font-bold text-stone-900">{activePreviewPiece.gold_karat || '22K'}</span>
                </div>
              </div>
              <div className="text-[10px] text-stone-400 flex items-center justify-between pt-1 border-t border-stone-100">
                <span>Receive Order: <strong>{activePreviewPiece.receive_order_number || '—'}</strong></span>
                <span>Work Order: <strong>{activePreviewPiece.work_order?.work_order_number || `WO-${activePreviewPiece.work_order_id}`}</strong></span>
                <span>Net Gold: <strong>{activePreviewPiece.net_gold_weight != null ? `${Number(activePreviewPiece.net_gold_weight).toFixed(3)}g` : (activePreviewPiece.net_weight != null ? `${Number(activePreviewPiece.net_weight).toFixed(3)}g` : '—')}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
