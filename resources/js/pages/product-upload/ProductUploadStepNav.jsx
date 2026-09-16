import React from 'react';
import { NavLink } from 'react-router-dom';
import { useProductSelection } from './useProductSelection';

export default function ProductUploadStepNav({ currentStep = 1 }) {
  const { selectedCount } = useProductSelection();

  const steps = [
    { number: 1, title: 'Upload Designs', path: '/product-upload/step1', icon: 'fa-solid fa-cloud-arrow-up' },
    { number: 2, title: 'Design Catalog', path: '/product-upload/step2', icon: 'fa-solid fa-border-all' },
    { number: 3, title: 'Product Selection', path: '/product-upload/step3', icon: 'fa-solid fa-square-check', badge: selectedCount },
    { number: 4, title: 'Download & Export', path: '/product-upload/step4', icon: 'fa-solid fa-file-arrow-down' },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-2 mb-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {steps.map((step) => {
          const isActive = currentStep === step.number;
          const isCompleted = currentStep > step.number;

          return (
            <NavLink
              key={step.number}
              to={step.path}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-[#b01622] text-white shadow-sm'
                  : isCompleted
                  ? 'bg-red-50/60 text-[#b01622] hover:bg-red-50'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                  isActive
                    ? 'bg-white text-[#b01622]'
                    : isCompleted
                    ? 'bg-[#b01622] text-white'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {isCompleted ? <i className="fa-solid fa-check text-[10px]"></i> : step.number}
              </div>

              <div className="flex-1 truncate">
                <span className="truncate block">{step.title}</span>
              </div>

              {step.badge !== undefined && step.badge > 0 && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-white text-[#b01622]' : 'bg-[#b01622] text-white'
                  }`}
                >
                  {step.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
