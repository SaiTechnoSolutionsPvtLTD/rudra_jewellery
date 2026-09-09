import React from 'react';

export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  itemsPerPage = 5,
  onPageChange,
  onItemsPerPageChange
}) {
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="bg-white px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
      
      {/* Items count summary */}
      <div className="flex items-center gap-3">
        <span>
          Showing <span className="font-bold text-gray-900">{startItem}</span> to{' '}
          <span className="font-bold text-gray-900">{endItem}</span> of{' '}
          <span className="font-bold text-gray-900">{totalItems}</span> entries
        </span>

        {onItemsPerPageChange && (
          <div className="flex items-center gap-1 ml-2">
            <span className="text-gray-400">Rows per page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              className="px-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700 focus:outline-none focus:border-[#b01622]"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center gap-1">
        {/* Previous Button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1 transition-colors ${
            currentPage === 1
              ? 'bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed'
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <i className="fa-solid fa-chevron-left text-[10px]"></i>
          <span>Previous</span>
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1 mx-1">
          {getPageNumbers().map(pageNum => (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`w-8 h-8 rounded-lg font-semibold flex items-center justify-center transition-colors ${
                currentPage === pageNum
                  ? 'bg-[#b01622] text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {pageNum}
            </button>
          ))}
        </div>

        {/* Next Button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalPages === 0}
          className={`px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1 transition-colors ${
            currentPage === totalPages || totalPages === 0
              ? 'bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed'
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <span>Next</span>
          <i className="fa-solid fa-chevron-right text-[10px]"></i>
        </button>
      </div>

    </div>
  );
}
