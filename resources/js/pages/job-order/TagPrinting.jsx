import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../../services/api';
import JewelleryTagCard, { buildPrintableTagsHtml, BarcodeSvgLines, getParsedDiamondList, getOverallDiamondTotals } from '../../components/JewelleryTagCard';
import { cleanProductName } from '../../utils/formatters';
import Pagination from '../../components/Pagination';

export default function TagPrinting() {
  const [searchParams] = useSearchParams();
  const initialWo = searchParams.get('wo') || '';
  const initialTag = searchParams.get('tag') || '';

  const [searchQuery, setSearchQuery] = useState(initialTag || initialWo || '');
  const [pieces, setPieces] = useState([]);
  const [activeSection, setActiveSection] = useState('active'); // 'active' | 'history'
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [activePreviewPiece, setActivePreviewPiece] = useState(null);
  const [previewCopies, setPreviewCopies] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchTags = async (q = '', section = activeSection) => {
    setCurrentPage(1);
    setLoading(true);
    try {
      const res = await api.get('/work-orders/tags', {
        params: { search: q, section: section }
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
    fetchTags(searchQuery, activeSection);
  }, [activeSection]);

  const handleSearch = (e) => {
    e?.preventDefault();
    setCurrentPage(1);
    fetchTags(searchQuery, activeSection);
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

      {/* Section Switcher Tabs: Active vs History */}
      <div className="flex items-center gap-3 border-b border-stone-200 mb-6 font-['Inter',sans-serif]">
        <button
          type="button"
          onClick={() => {
            setActiveSection('active');
            setCurrentPage(1);
            setSelectedIds([]);
          }}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold whitespace-nowrap border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeSection === 'active'
              ? 'text-[#b01622] border-[#b01622]'
              : 'text-stone-500 border-transparent hover:text-stone-800'
          }`}
        >
          <i className="fa-solid fa-tags"></i>
          <span>Eligible Tags (Active)</span>
          {activeSection === 'active' && !loading && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#b01622]/10 text-[#b01622]">
              {pieces.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSection('history');
            setCurrentPage(1);
            setSelectedIds([]);
          }}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold whitespace-nowrap border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeSection === 'history'
              ? 'text-emerald-700 border-emerald-700'
              : 'text-stone-500 border-transparent hover:text-stone-800'
          }`}
        >
          <i className="fa-solid fa-clock-rotate-left"></i>
          <span>Tag Printing History (Delivered Work Orders)</span>
          {activeSection === 'history' && !loading && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
              {pieces.length}
            </span>
          )}
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs mb-6">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs"></i>
            <input
              type="text"
              placeholder={activeSection === 'history' ? "Search delivered tags history by Tag Number, Work Order, or Design..." : "Search by Tag Number (e.g. TAG-2026-000001), Work Order No, or Design No..."}
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
            onClick={() => fetchTags(searchQuery, activeSection)}
            className="px-4 py-2.5 bg-white border border-stone-200 text-stone-700 text-xs font-bold rounded-lg hover:bg-stone-50 transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
            title="Refresh tags list"
          >
            <i className="fa-solid fa-arrows-rotate text-stone-500"></i>
            <span>Refresh</span>
          </button>
          {searchQuery && (
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setCurrentPage(1); fetchTags('', activeSection); }}
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
              <i className={activeSection === 'history' ? "fa-solid fa-clock-rotate-left text-emerald-600" : "fa-solid fa-tag"}></i>
            </div>
            <h3 className="text-sm font-bold text-stone-800">
              {activeSection === 'history' ? 'No Delivered Work Order Tags Found' : 'No Eligible Jewellery Tags Found'}
            </h3>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              {activeSection === 'history'
                ? 'Tags belonging to work orders that are sold and delivered to clients appear in this history archive.'
                : 'Physical pieces receive a unique tag when received in the "Receive Work Order" page and remain eligible here until delivered.'}
            </p>
            {activeSection !== 'history' && (
              <Link
                to="/job-order/receive"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-[#b01622] text-white text-xs font-bold rounded-lg hover:bg-[#8f1019]"
              >
                Go to Receive Work Order
              </Link>
            )}
          </div>
        ) : (
          <div>
            {pagePieces.length > 0 && pagePieces.every((piece) => selectedIds.includes(piece.id)) && pieces.length > pagePieces.length && (
              <div className="bg-amber-50/90 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2">
                <span>
                  {selectedIds.length === pieces.length ? (
                    <span>All <strong>{pieces.length}</strong> tags across all {totalPages} pages are selected.</span>
                  ) : (
                    <span>All <strong>{pagePieces.length}</strong> tags on page {safePage} are selected.</span>
                  )}
                </span>
                <div className="flex items-center gap-3 font-semibold">
                  {selectedIds.length !== pieces.length ? (
                    <button
                      type="button"
                      onClick={() => setSelectedIds(pieces.map((p) => p.id))}
                      className="text-[#b01622] hover:underline cursor-pointer font-bold"
                    >
                      Select all {pieces.length} tags across all pages
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSelectedIds([])}
                      className="text-stone-600 hover:underline cursor-pointer"
                    >
                      Clear selection
                    </button>
                  )}
                </div>
              </div>
            )}
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
                  <th className="p-3 text-center w-12">S.No</th>
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
                {pagePieces.map((piece, idx) => {
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
                      onClick={() => setActivePreviewPiece(piece)}
                      className={`cursor-pointer hover:bg-amber-50/50 transition-colors ${isSelected ? 'bg-amber-50/70' : ''}`}
                    >
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(piece.id)}
                          className="rounded border-stone-300 text-[#b01622] focus:ring-[#b01622]"
                        />
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-stone-400 text-xs">
                        {(safePage - 1) * itemsPerPage + idx + 1}
                      </td>
                      <td className="p-3 whitespace-nowrap text-left align-middle">
                        <div className="flex flex-col items-start gap-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded font-mono font-bold text-xs text-stone-900 bg-stone-100 border border-stone-200">
                            {piece.tag_number}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-stone-400 font-medium pl-0.5">Piece #{piece.piece_number}</span>
                            {(activeSection === 'history' || piece.is_delivered) && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Delivered
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
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
                      <td className="p-3 max-w-xs truncate" title={cleanProductName(piece.product_name, piece.design_no)} onClick={(e) => e.stopPropagation()}>
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
                      <td className="p-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setActivePreviewPiece(piece)}
                            className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded text-xs font-bold transition-colors"
                            title="Preview Tag & Material Details"
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
        </div>
      )}
      {!loading && (
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
          showWhenEmpty={true}
        />
      )}
    </div>

      {/* Preview & Complete Material Specifications Modal */}
      {activePreviewPiece && (() => {
        const { list: diaVariants, totalWeight: overallDiaWt, totalCount: overallDiaCount, totalDiaString } = getOverallDiamondTotals(activePreviewPiece);
        const grossWt = activePreviewPiece.gross_weight != null ? Number(activePreviewPiece.gross_weight).toFixed(3) : '0.000';
        const netGoldWt = activePreviewPiece.net_gold_weight != null ? Number(activePreviewPiece.net_gold_weight).toFixed(3) : (activePreviewPiece.net_weight != null ? Number(activePreviewPiece.net_weight).toFixed(3) : '0.000');
        const purityVal = activePreviewPiece.purity != null ? Number(activePreviewPiece.purity).toFixed(2) : '91.60';
        const karatVal = activePreviewPiece.gold_karat || '22K';
        const pure24kWt = activePreviewPiece.pure_24k_weight != null ? Number(activePreviewPiece.pure_24k_weight).toFixed(3) : '0.000';
        const oldWt = activePreviewPiece.old_weight != null ? Number(activePreviewPiece.old_weight).toFixed(3) : '0.000';
        const silverWt = activePreviewPiece.silver_weight != null ? Number(activePreviewPiece.silver_weight).toFixed(3) : '0.000';
        const colorStoneWt = activePreviewPiece.color_stone_weight != null ? Number(activePreviewPiece.color_stone_weight).toFixed(3) : '0.000';
        const colorStoneCount = activePreviewPiece.color_stone_count || 0;
        const wastageWt = activePreviewPiece.wastage_weight != null ? Number(activePreviewPiece.wastage_weight).toFixed(3) : '0.000';
        const karigarGoldWt = activePreviewPiece.karigar_gold_weight != null ? Number(activePreviewPiece.karigar_gold_weight).toFixed(3) : '0.000';
        const returnedGoldWt = activePreviewPiece.returned_gold_weight != null ? Number(activePreviewPiece.returned_gold_weight).toFixed(3) : '0.000';
        const mcRate = activePreviewPiece.making_charge_per_gram != null ? Number(activePreviewPiece.making_charge_per_gram).toFixed(2) : '—';
        const mcType = activePreviewPiece.making_charge_type || 'per_gram';
        const totalMC = activePreviewPiece.total_making_charge != null ? Number(activePreviewPiece.total_making_charge).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';

        return (
          <div className="fixed inset-0 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl sm:rounded-3xl max-w-4xl w-full shadow-2xl border border-stone-200 overflow-hidden my-auto flex flex-col max-h-[92vh]">
              {/* Modal Sticky Header */}
              <div className="px-5 py-3.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between no-print shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-red-50 text-[#b01622] flex items-center justify-center text-sm border border-red-100 shadow-2xs">
                    <i className="fa-solid fa-tags"></i>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-gray-900 text-sm sm:text-base tracking-tight">
                        {activePreviewPiece.tag_number || 'Tag Details'}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-200 text-stone-700 font-mono">
                        Piece #{activePreviewPiece.piece_number || '1'}
                      </span>
                      {activePreviewPiece.is_delivered && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Delivered
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-500 font-medium">
                      {cleanProductName(activePreviewPiece.product_name, activePreviewPiece.design_no) || 'Jewellery Piece'} {activePreviewPiece.design_no && `(${activePreviewPiece.design_no})`}
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
                    title="Close"
                  >
                    <i className="fa-solid fa-xmark text-xs"></i>
                  </button>
                </div>
              </div>

              {/* Modal Scrollable Body */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-6 bg-stone-50/50">
                {/* 1. Official Physical Tag Card Preview */}
                <div className="bg-stone-100/80 p-5 rounded-2xl border border-stone-200 flex flex-col items-center justify-center gap-2.5">
                  <div className="flex items-center justify-between w-full max-w-[125mm] px-1 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                    <span>Physical Tag Preview</span>
                    <span className="text-[#b01622] font-mono">125mm × 38mm</span>
                  </div>
                  <JewelleryTagCard piece={activePreviewPiece} id="active-tag-preview" />
                  <span className="text-[10.5px] text-stone-500 text-center max-w-md">
                    Dotted crease indicates fold before barcode label. Tag displays up to 3 diamond rows formatted as <span className="font-mono font-bold text-stone-700">+stamp/count/wt</span> (with <span className="font-mono font-bold text-stone-700">....</span> dots after 3rd row if 4+ variants exist) and overall total diamond weight in <span className="font-mono font-bold text-stone-700">T.Dia</span>.
                  </span>
                </div>

                {/* 2. All Diamond Details & Multi-Variant Breakdown */}
                <div className="bg-white rounded-2xl border border-purple-200 shadow-2xs overflow-hidden">
                  <div className="px-4 py-3 bg-gradient-to-r from-purple-50 via-indigo-50/40 to-white border-b border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center text-xs">
                        <i className="fa-solid fa-gem"></i>
                      </div>
                      <div>
                        <h4 className="font-black text-purple-950 text-xs sm:text-sm tracking-tight">
                          Diamond Details & Multi-Variant Breakdown
                        </h4>
                        <p className="text-[10px] text-purple-700">
                          Complete list of diamond stamps, pieces, and carats assigned to this piece.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold bg-purple-100/90 text-purple-900 border border-purple-200">
                        {diaVariants.length} Diamond {diaVariants.length === 1 ? 'Variant' : 'Variants'}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold bg-indigo-100 text-indigo-900 border border-indigo-200">
                        Total Dia: {totalDiaString}
                      </span>
                    </div>
                  </div>

                  {diaVariants.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-purple-50/60 border-b border-purple-100 text-[10.5px] font-bold text-purple-900 uppercase tracking-wider">
                            <th className="py-2.5 px-4 w-12 text-center">#</th>
                            <th className="py-2.5 px-4">Diamond Stamp</th>
                            <th className="py-2.5 px-4 text-center">No. of Pieces</th>
                            <th className="py-2.5 px-4 text-right">Carat Weight</th>
                            <th className="py-2.5 px-4 text-center">Tag Printing Location</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-purple-50 text-stone-700 font-medium">
                          {diaVariants.map((dia, dIdx) => (
                            <tr key={dIdx} className="hover:bg-purple-50/30 transition-colors">
                              <td className="py-2.5 px-4 text-center font-mono font-bold text-stone-400">
                                {dIdx + 1}
                              </td>
                              <td className="py-2.5 px-4 font-mono font-bold text-purple-950">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-purple-100 text-purple-900 border border-purple-200">
                                  {dia.stamp}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-center font-mono font-semibold text-stone-800">
                                {dia.count} pcs
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-black text-indigo-900">
                                {Number(dia.weight).toFixed(3)} ct
                              </td>
                              <td className="py-2.5 px-4 text-center">
                                {dIdx === 0 && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    Printed on Tag (Row 1)
                                  </span>
                                )}
                                {dIdx === 1 && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    Printed on Tag (Row 2)
                                  </span>
                                )}
                                {dIdx === 2 && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    Printed on Tag (Row 3)
                                  </span>
                                )}
                                {dIdx >= 3 && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-600 border border-stone-200" title="Included in overall total diamond weight">
                                    Included in Total Dia (Variant {dIdx + 1})
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-purple-100/70 border-t-2 border-purple-200 font-bold text-xs text-purple-950">
                          <tr>
                            <td colSpan={2} className="py-2.5 px-4 uppercase tracking-wide font-extrabold text-purple-950">
                              Overall Total Diamonds ({diaVariants.length} variants)
                            </td>
                            <td className="py-2.5 px-4 text-center font-mono font-black text-purple-950">
                              {overallDiaCount} pcs
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-black text-indigo-950 text-sm">
                              {overallDiaWt.toFixed(3)} ct ({totalDiaString})
                            </td>
                            <td className="py-2.5 px-4 text-center text-[10.5px] font-semibold text-purple-800">
                              Displayed in T.Dia
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs text-stone-400">
                      No diamond variants assigned to this piece. Tag displays <span className="font-mono font-bold text-stone-600">+0/0/0.00</span>.
                    </div>
                  )}
                </div>

                {/* 3. Gold & Material Specifications Grid */}
                <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
                  <div className="px-4 py-3 bg-stone-50 border-b border-stone-200 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center text-xs">
                      <i className="fa-solid fa-coins"></i>
                    </div>
                    <div>
                      <h4 className="font-black text-stone-900 text-xs sm:text-sm tracking-tight">
                        Gold & Material Specifications
                      </h4>
                      <p className="text-[10px] text-stone-500">
                        Weights, purity touch %, pure 24K conversion, and artisan gold reconciliations.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
                    {/* Gross Weight */}
                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Gross Weight</span>
                      <span className="font-mono font-black text-stone-900 text-base mt-1">{grossWt}g</span>
                      <span className="text-[9.5px] text-stone-400 mt-0.5">Printed on Tag (G.Wt)</span>
                    </div>

                    {/* Net Gold Weight */}
                    <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Net Gold Weight</span>
                      <span className="font-mono font-black text-amber-950 text-base mt-1">{netGoldWt}g</span>
                      <span className="text-[9.5px] text-amber-700 mt-0.5">Gross minus stone & silver</span>
                    </div>

                    {/* Gold Karat & Touch Purity */}
                    <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Karat / Purity</span>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="font-black text-amber-950 text-base">{karatVal}</span>
                        <span className="font-mono font-bold text-stone-600 text-xs">({purityVal}%)</span>
                      </div>
                      <span className="text-[9.5px] text-amber-700 mt-0.5">Printed on Tag ({karatVal})</span>
                    </div>

                    {/* Pure 24K Gold */}
                    <div className="bg-yellow-50/70 p-3 rounded-xl border border-yellow-200 flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-yellow-900 uppercase tracking-wider">Pure 24K Gold</span>
                      <span className="font-mono font-black text-yellow-950 text-base mt-1">{pure24kWt}g</span>
                      <span className="text-[9.5px] text-yellow-700 mt-0.5">Net Gold × {purityVal}%</span>
                    </div>

                    {/* Old Gold Weight */}
                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Old Gold Weight</span>
                      <span className="font-mono font-bold text-stone-800 text-sm mt-1">{oldWt}g</span>
                      <span className="text-[9.5px] text-stone-400 mt-0.5">Exchanged raw gold</span>
                    </div>

                    {/* Silver Weight */}
                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Silver Weight</span>
                      <span className="font-mono font-bold text-stone-800 text-sm mt-1">{silverWt}g</span>
                      <span className="text-[9.5px] text-stone-400 mt-0.5">Silver components</span>
                    </div>

                    {/* Color Stones */}
                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Color Stones</span>
                      <span className="font-mono font-bold text-stone-800 text-sm mt-1">
                        {colorStoneWt}ct <span className="text-stone-500 text-xs font-normal">({colorStoneCount} pcs)</span>
                      </span>
                      <span className="text-[9.5px] text-stone-400 mt-0.5">Gemstones / beads</span>
                    </div>

                    {/* Wastage Gold */}
                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Wastage Gold</span>
                      <span className="font-mono font-bold text-stone-800 text-sm mt-1">{wastageWt}g</span>
                      <span className="text-[9.5px] text-stone-400 mt-0.5">Manufacturing allowance</span>
                    </div>

                    {/* Karigar Gold */}
                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Karigar Gold</span>
                      <span className="font-mono font-bold text-stone-800 text-sm mt-1">{karigarGoldWt}g</span>
                      <span className="text-[9.5px] text-stone-400 mt-0.5">Artisan retained metal</span>
                    </div>

                    {/* Returned Scrap Gold */}
                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Returned Scrap Gold</span>
                      <span className="font-mono font-bold text-stone-800 text-sm mt-1">{returnedGoldWt}g</span>
                      <span className="text-[9.5px] text-stone-400 mt-0.5">Returned pure/scrap scrap</span>
                    </div>

                    {/* Making Charges */}
                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 flex flex-col justify-between col-span-2">
                      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Making Charges</span>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="font-mono font-bold text-stone-800 text-sm">
                          ₹{mcRate} <span className="text-[10px] text-stone-500 font-normal">({mcType})</span>
                        </span>
                        <span className="font-mono font-black text-stone-900 text-sm">Total: ₹{totalMC}</span>
                      </div>
                      <span className="text-[9.5px] text-stone-400 mt-0.5">Artisan labour charges</span>
                    </div>
                  </div>
                </div>

                {/* 4. Traceability, Karigar & Compliance Metadata */}
                <div className="bg-white rounded-2xl border border-stone-200 p-4 text-xs">
                  <span className="text-[10.5px] font-bold text-stone-500 uppercase tracking-wider block mb-3">
                    Order & Quality Traceability
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11.5px]">
                    <div>
                      <span className="text-stone-400 block text-[9.5px] font-semibold uppercase">Work Order</span>
                      <Link
                        to={`/job-order/${activePreviewPiece.work_order_id}/details`}
                        className="font-bold text-[#b01622] hover:underline"
                      >
                        {activePreviewPiece.work_order?.work_order_number || `WO-${activePreviewPiece.work_order_id}`}
                      </Link>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[9.5px] font-semibold uppercase">Receive Order</span>
                      <span className="font-mono font-bold text-stone-900">
                        {activePreviewPiece.receive_order_number || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[9.5px] font-semibold uppercase">Karigar / Artisan</span>
                      <span className="font-semibold text-stone-800">
                        {activePreviewPiece.karigar?.name || activePreviewPiece.work_order?.karigar_name || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[9.5px] font-semibold uppercase">Received Date</span>
                      <span className="text-stone-700 font-medium">
                        {activePreviewPiece.received_at ? new Date(activePreviewPiece.received_at).toLocaleDateString() : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[9.5px] font-semibold uppercase">Certification</span>
                      <span className="font-mono font-bold text-stone-800">
                        {activePreviewPiece.certificate_no || activePreviewPiece.certification_status || '—'}
                      </span>
                      {activePreviewPiece.certification_agency && (
                        <span className="text-[10px] text-stone-500 block">{activePreviewPiece.certification_agency}</span>
                      )}
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[9.5px] font-semibold uppercase">Hallmarking</span>
                      <span className="font-mono font-bold text-stone-800">
                        {activePreviewPiece.huid || activePreviewPiece.hallmarking_status || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[9.5px] font-semibold uppercase">Design Number</span>
                      <span className="font-mono font-bold text-stone-900">
                        {activePreviewPiece.design_no || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[9.5px] font-semibold uppercase">Status</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-800 border border-stone-200">
                        {activePreviewPiece.is_delivered ? 'Delivered' : (activePreviewPiece.status || 'Received')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Sticky Footer */}
              <div className="px-5 py-3 bg-stone-100/80 border-t border-stone-200 flex items-center justify-between text-xs shrink-0 no-print">
                <span className="text-stone-500 font-medium">
                  Click <span className="font-bold text-stone-700">Print Tag</span> to send to the thermal / jewelry tag printer.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActivePreviewPiece(null);
                      setPreviewCopies(1);
                    }}
                    className="px-4 py-1.5 bg-white border border-stone-300 text-stone-700 rounded-xl font-bold hover:bg-stone-50 transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const items = Array.from({ length: Math.max(1, previewCopies) }, () => activePreviewPiece);
                      printTagsHtml(items);
                    }}
                    className="px-4 py-1.5 bg-[#b01622] text-white rounded-xl font-bold hover:bg-[#8f1019] transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <i className="fa-solid fa-print"></i>
                    <span>Print Tag</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
