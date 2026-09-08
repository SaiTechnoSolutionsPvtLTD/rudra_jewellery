import React, { createContext, useContext, useState } from 'react';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);

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

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
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
            {/* Icon */}
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

            {/* Content */}
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

            {/* Close Button */}
            <button
              onClick={hideToast}
              className="text-gray-400 hover:text-gray-600 p-1 text-sm transition-colors"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>

            {/* Countdown Progress Line */}
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
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
