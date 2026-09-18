import React, { createContext, useContext, useState } from 'react';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);

  // Modal State for custom project-themed prompt / confirm / alert dialogs
  const [modalConfig, setModalConfig] = useState(null);
  const [modalInputValue, setModalInputValue] = useState('');

  const showToast = (message, type = 'error', title = '') => {
    const id = Date.now();
    setToast({
      id,
      message,
      type,
      title: title || (type === 'error' ? 'Validation Error' : type === 'success' ? 'Success' : 'Notification')
    });

    setTimeout(() => {
      setToast(prev => (prev?.id === id ? null : prev));
    }, 3000);
  };

  const hideToast = () => {
    setToast(null);
  };

  const success = (message, title = 'Success') => showToast(message, 'success', title);
  const error = (message, title = 'Validation Error') => showToast(message, 'error', title);
  const info = (message, title = 'Notification') => showToast(message, 'info', title);

  // Project-themed Modal Dialog Helpers
  const showPrompt = ({ title = 'Input Required', message = '', placeholder = '', initialValue = '', icon = 'fa-solid fa-pen-to-square', confirmText = 'Submit', cancelText = 'Cancel' }) => {
    return new Promise((resolve) => {
      setModalInputValue(initialValue);
      setModalConfig({
        type: 'prompt',
        title,
        message,
        placeholder,
        icon,
        confirmText,
        cancelText,
        onConfirm: (val) => {
          setModalConfig(null);
          resolve(val);
        },
        onCancel: () => {
          setModalConfig(null);
          resolve(null);
        },
      });
    });
  };

  const showConfirm = ({ title = 'Confirm Action', message = '', icon = 'fa-solid fa-circle-question', confirmText = 'Confirm', cancelText = 'Cancel' }) => {
    return new Promise((resolve) => {
      setModalConfig({
        type: 'confirm',
        title,
        message,
        icon,
        confirmText,
        cancelText,
        onConfirm: () => {
          setModalConfig(null);
          resolve(true);
        },
        onCancel: () => {
          setModalConfig(null);
          resolve(false);
        },
      });
    });
  };

  const showAlert = ({ title = 'Notice', message = '', icon = 'fa-solid fa-circle-info', confirmText = 'OK' }) => {
    return new Promise((resolve) => {
      setModalConfig({
        type: 'alert',
        title,
        message,
        icon,
        confirmText,
        onConfirm: () => {
          setModalConfig(null);
          resolve(true);
        },
        onCancel: () => {
          setModalConfig(null);
          resolve(true);
        },
      });
    });
  };

  return (
    <ToastContext.Provider value={{ showToast, hideToast, success, error, info, showPrompt, showConfirm, showAlert }}>
      {children}

      {/* Floating Toast Notification Popup */}
      {toast && (
        <div key={toast.id} className="fixed top-5 right-5 z-50 max-w-md w-full animate-fade-in-down">
          <div className={`rounded-xl shadow-2xl border p-4 flex items-start gap-3 backdrop-blur-md relative overflow-hidden transition-all ${
            toast.type === 'error' 
              ? 'bg-white border-red-200 text-red-900 shadow-red-500/10'
              : toast.type === 'success'
              ? 'bg-white border-green-200 text-green-900 shadow-green-500/10'
              : 'bg-white border-amber-200 text-amber-900 shadow-amber-500/10'
          }`}>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-base ${
              toast.type === 'error'
                ? 'bg-red-50 text-[#b01622]'
                : toast.type === 'success'
                ? 'bg-green-50 text-green-600'
                : 'bg-amber-50 text-amber-600'
            }`}>
              <i className={
                toast.type === 'error'
                  ? 'fa-solid fa-triangle-exclamation'
                  : toast.type === 'success'
                  ? 'fa-solid fa-circle-check'
                  : 'fa-solid fa-circle-info'
              }></i>
            </div>

            <div className="flex-1 pr-2">
              <h4 className={`text-xs font-bold uppercase tracking-wider mb-0.5 ${
                toast.type === 'error' ? 'text-[#b01622]' : toast.type === 'success' ? 'text-green-700' : 'text-amber-700'
              }`}>
                {toast.title}
              </h4>
              <p className="text-xs text-gray-700 font-medium leading-relaxed">
                {toast.message}
              </p>
            </div>

            <button
              onClick={hideToast}
              className="text-gray-400 hover:text-gray-600 p-1 text-sm transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>

            <div
              className={`absolute bottom-0 left-0 h-1 transition-all ease-linear ${
                toast.type === 'error' ? 'bg-[#b01622]' : toast.type === 'success' ? 'bg-green-500' : 'bg-amber-500'
              }`}
              style={{
                animation: 'toastProgress 3s linear forwards'
              }}
            />
          </div>
        </div>
      )}

      {/* Luxury Project-Themed Alert / Prompt / Confirm Modal Overlay */}
      {modalConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs transition-opacity animate-fade-in">
          <div className="bg-white border border-stone-200 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 font-['Inter',-apple-system,BlinkMacSystemFont,sans-serif] text-stone-800">
            
            {/* Header Badge & Title */}
            <div className="flex items-start gap-3.5 border-b border-stone-100 pb-3.5">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-[#b01622] flex items-center justify-center text-lg shrink-0 border border-red-100/60 shadow-2xs">
                <i className={modalConfig.icon || 'fa-solid fa-gem'}></i>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold text-[#b01622] uppercase tracking-wider">
                  Rudra Jewellers System Alert
                </div>
                <h3 className="text-base font-bold text-stone-900 leading-snug truncate">
                  {modalConfig.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={modalConfig.onCancel}
                className="text-stone-400 hover:text-stone-600 p-1 cursor-pointer transition-colors"
              >
                <i className="fa-solid fa-xmark text-base"></i>
              </button>
            </div>

            {/* Message Body */}
            {modalConfig.message && (
              <p className="text-xs font-medium text-stone-600 leading-relaxed">
                {modalConfig.message}
              </p>
            )}

            {/* Input Box for Prompt */}
            {modalConfig.type === 'prompt' && (
              <div className="pt-1">
                <textarea
                  rows="3"
                  autoFocus
                  value={modalInputValue}
                  onChange={(e) => setModalInputValue(e.target.value)}
                  placeholder={modalConfig.placeholder || 'Enter reason or notes...'}
                  className="w-full bg-stone-50/50 border border-stone-300 focus:border-[#b01622] focus:bg-white rounded-xl p-3 text-xs font-semibold text-stone-900 focus:outline-hidden shadow-2xs resize-none"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-100">
              {modalConfig.type !== 'alert' && (
                <button
                  type="button"
                  onClick={modalConfig.onCancel}
                  className="px-4 py-2 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-bold rounded-xl cursor-pointer transition-all shadow-2xs"
                >
                  {modalConfig.cancelText || 'Cancel'}
                </button>
              )}
              <button
                type="button"
                onClick={() => modalConfig.onConfirm(modalConfig.type === 'prompt' ? modalInputValue : true)}
                className="px-5 py-2 bg-[#b01622] hover:bg-[#8e111a] text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-xs"
              >
                {modalConfig.confirmText || 'OK'}
              </button>
            </div>

          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
