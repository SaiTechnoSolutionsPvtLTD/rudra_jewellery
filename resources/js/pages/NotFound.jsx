import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6 font-['Inter',sans-serif] relative overflow-hidden">
      <div className="relative z-10 max-w-md w-full text-center space-y-6 bg-white border border-stone-200 rounded-2xl p-8 sm:p-10 shadow-xl">
        {/* Brand Monogram */}
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-[#8a131c] to-[#b01622] border-2 border-[#d4af37] flex items-center justify-center text-[#f3d98b] font-bold text-xl tracking-wider shadow-lg">
          RJ
        </div>

        {/* 404 Header */}
        <div className="space-y-2">
          <div className="inline-block text-xs font-semibold uppercase tracking-[3px] text-[#d4af37] px-3 py-1 bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.3)] rounded-full">
            Error 404
          </div>
          <h1 className="text-3xl font-bold text-[#f7ede2] tracking-tight">
            Page Not Found
          </h1>
          <p className="text-sm text-stone-400 leading-relaxed max-w-sm mx-auto">
            The requested page or resource could not be found. It may have been moved, renamed, or is temporarily unavailable.
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center justify-center gap-3 text-[#d4af37] opacity-60 text-xs">
          <div className="h-px bg-[rgba(212,175,55,0.3)] w-16" />
          <span>✦</span>
          <div className="h-px bg-[rgba(212,175,55,0.3)] w-16" />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-[#d4af37] to-[#b8972e] text-[#1a120b] text-xs font-bold rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-house"></i>
            Go to Dashboard
          </button>

          <button
            onClick={() => window.history.back()}
            className="w-full sm:w-auto px-5 py-2.5 bg-stone-900/80 border border-stone-700 hover:border-stone-500 text-stone-300 hover:text-white text-xs font-semibold rounded-xl active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-arrow-left"></i>
            Go Back
          </button>
        </div>

        <div className="text-[11px] text-stone-500 pt-2">
          Rudra Jewellery • Timeless Elegance
        </div>
      </div>
    </div>
  );
}
