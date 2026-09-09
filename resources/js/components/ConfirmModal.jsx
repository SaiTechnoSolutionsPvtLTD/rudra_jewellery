import React from 'react';

export default function ConfirmModal({
  isOpen,
  title = 'Delete Confirmation',
  message = 'Are you sure you want to delete this item? This action cannot be undone.',
  confirmText = 'Yes, Delete',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
  confirmIcon = 'fa-regular fa-trash-can',
  headerIcon = 'fa-solid fa-triangle-exclamation'
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 transform transition-all scale-100">
        
        {/* Icon & Warning Badge */}
        <div className="w-12 h-12 rounded-full bg-red-100 text-[#b01622] flex items-center justify-center text-xl mb-4 mx-auto">
          <i className={headerIcon}></i>
        </div>

        {/* Title & Message */}
        <div className="text-center mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 px-4 bg-[#b01622] hover:bg-[#90121b] text-white text-xs font-semibold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <i className="fa-solid fa-circle-notch fa-spin"></i>
            ) : (
              <>
                {confirmIcon && <i className={confirmIcon}></i>}
                {confirmText}
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
