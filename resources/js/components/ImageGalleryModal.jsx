import React, { useState, useEffect } from 'react';

export default function ImageGalleryModal({ isOpen, onClose, images = [], title = '', details = {} }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setCurrentIndex(0);
  }, [isOpen, images]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, images]);

  if (!isOpen || !images || images.length === 0) return null;

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const currentImage = images[currentIndex];

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 cursor-pointer"
      onClick={onClose}
    >
      {/* Top Bar */}
      <div
        className="absolute top-4 left-4 right-4 flex items-center justify-between text-white z-20 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h3 className="font-bold text-lg tracking-wide">{title || 'Design Preview'}</h3>
          {details.design_no && (
            <p className="text-xs text-gray-300">
              Design No: <span className="font-semibold text-white">{details.design_no}</span>
              {details.net_wt && ` • Net Wt: ${details.net_wt}g`}
              {details.dia_wt && ` • Dia Wt: ${details.dia_wt}ct`}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors text-lg cursor-pointer"
          title="Close (Esc)"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      {/* Main Image Container */}
      <div
        className="relative max-w-4xl max-h-[75vh] w-full h-full flex items-center justify-center cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {images.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-2 sm:-left-12 z-20 w-11 h-11 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/20 flex items-center justify-center transition-all cursor-pointer"
            title="Previous (Left Arrow)"
          >
            <i className="fa-solid fa-chevron-left text-lg"></i>
          </button>
        )}

        <img
          src={currentImage}
          alt={title || 'Product'}
          className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl drop-shadow-md select-none transition-all duration-200"
        />

        {images.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-2 sm:-right-12 z-20 w-11 h-11 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/20 flex items-center justify-center transition-all cursor-pointer"
            title="Next (Right Arrow)"
          >
            <i className="fa-solid fa-chevron-right text-lg"></i>
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Bar & Counter */}
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-20 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {images.length > 1 && (
          <>
            <div className="flex items-center gap-2 max-w-md overflow-x-auto py-1 px-2 bg-black/60 backdrop-blur-sm rounded-full border border-white/10">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                    idx === currentIndex
                      ? 'border-[#b01622] scale-105 shadow-md'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover bg-white" />
                </button>
              ))}
            </div>
            <div className="bg-black/70 text-white text-xs px-3 py-1 rounded-full font-medium border border-white/10">
              {currentIndex + 1} / {images.length}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
