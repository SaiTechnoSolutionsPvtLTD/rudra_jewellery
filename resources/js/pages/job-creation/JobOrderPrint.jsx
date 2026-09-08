import React from 'react';

export default function JobOrderPrint() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-gray-100 p-8 min-h-screen">
      <style>{`
        .a4-container {
          width: 210mm;
          min-height: 297mm;
          padding: 15mm;
          margin: 0 auto;
          background: white;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          position: relative;
        }
        @media print {
          body { background: white; padding: 0; }
          .a4-container { box-shadow: none; width: 100%; height: auto; min-height: auto; margin: 0; padding: 10mm; }
          .no-print { display: none; }
        }
        .watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 8rem;
          font-weight: 800;
          color: rgba(0,0,0,0.02);
          white-space: nowrap;
          pointer-events: none;
          z-index: 0;
        }
      `}</style>

      <div className="no-print text-center mb-6">
        <button
          onClick={handlePrint}
          className="px-6 py-2.5 bg-[#b01622] text-white font-semibold text-sm rounded-lg shadow-md hover:bg-[#90121b] transition-colors"
        >
          <i className="fa-solid fa-print mr-2"></i> Print Job Order
        </button>
      </div>

      <div className="a4-container relative z-10">
        <div className="watermark">RUDRA JEWELLERS</div>
        
        {/* Header Section */}
        <header className="flex justify-between items-start mb-6 border-b border-gray-300 pb-6 relative z-10">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-[#b01622] flex items-center justify-center p-1">
              <img src="/logo.png" alt="Rudra Jewellers" className="h-full w-full object-contain" />
            </div>
            
            <div>
              <h1 className="text-2xl font-bold text-[#b01622] tracking-tight">RUDRA JEWELLERS</h1>
              <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Enterprise ERP System</p>
              
              <div className="mt-4 text-[10px] text-gray-600 space-y-1">
                <p>Regd. Office: 402, Heritage Plaza, MG Road</p>
                <p>Contact: +91 22 4000 8888 | erp@rudrajewellers.com</p>
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <h2 className="text-lg font-bold text-gray-900 mb-1 tracking-wider">JOB ORDER</h2>
            <div className="bg-gray-100 px-3 py-1 text-xs font-bold text-[#b01622] inline-block rounded mb-1">
              WO ID: WO-2024-0012
            </div>
            <div className="text-[10px] text-gray-500">Date: October 24, 2023</div>
          </div>
        </header>

        {/* Main Content */}
        <main className="relative z-10 space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <div className="text-[9px] font-bold text-gray-900 uppercase tracking-wider mb-1">Artisan Name</div>
              <div className="text-sm text-gray-700">Rajesh Vishwakarma</div>
            </div>
            <div>
              <div className="text-[9px] font-bold text-gray-900 uppercase tracking-wider mb-1">Item Type</div>
              <div className="text-sm text-gray-700 leading-tight">Royal Bridal<br />Necklace</div>
            </div>
            <div>
              <div className="text-[9px] font-bold text-gray-900 uppercase tracking-wider mb-1">Quantity</div>
              <div className="text-sm text-gray-700">01 Unit</div>
            </div>
            <div>
              <div className="text-[9px] font-bold text-gray-900 uppercase tracking-wider mb-1">Priority</div>
              <div className="inline-block bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-200">
                URGENT (Tier 1)
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <i className="fa-solid fa-gem text-[#b01622] text-xs"></i>
              <h3 className="text-xs font-bold text-[#b01622] uppercase tracking-wider">Material Allocation</h3>
            </div>
            
            <table className="w-full text-left text-xs border border-gray-200">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="py-2 px-3 font-bold text-gray-900 w-2/5">Material Type</th>
                  <th className="py-2 px-3 font-bold text-gray-900 text-center">Weight (g) / Qty</th>
                  <th className="py-2 px-3 font-bold text-gray-900 text-center">Carat/Size</th>
                  <th className="py-2 px-3 font-bold text-gray-900 text-center">Clarity/Cut/Color</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-gray-700">
                <tr>
                  <td className="py-2.5 px-3">22K Yellow Gold (BIS Hallmark)</td>
                  <td className="py-2.5 px-3 text-center">124.50g</td>
                  <td className="py-2.5 px-3 text-center">-</td>
                  <td className="py-2.5 px-3 text-center">-</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3">Round Brilliant Diamonds</td>
                  <td className="py-2.5 px-3 text-center">42 Stones</td>
                  <td className="py-2.5 px-3 text-center">9.15 ct (Avg)</td>
                  <td className="py-2.5 px-3 text-center">VVS1 / EX / G-H</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 leading-tight">Marquise Diamonds (Side Accents)</td>
                  <td className="py-2.5 px-3 text-center">12 Stones</td>
                  <td className="py-2.5 px-3 text-center">0.30 ct (Avg)</td>
                  <td className="py-2.5 px-3 text-center">VS1 / VG / F-G</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3">Natural Burmese Ruby (Center)</td>
                  <td className="py-2.5 px-3 text-center">01 Stone</td>
                  <td className="py-2.5 px-3 text-center">4.20 ct</td>
                  <td className="py-2.5 px-3 text-center leading-tight">Oval / Pigeon Blood</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <i className="fa-regular fa-calendar text-[#b01622] text-xs"></i>
                <h3 className="text-xs font-bold text-[#b01622] uppercase tracking-wider">Production Timeline</h3>
              </div>
              
              <div className="border border-gray-200 rounded divide-y divide-gray-200 text-xs text-gray-700">
                <div className="flex justify-between px-3 py-2">
                  <span className="font-medium text-gray-900">EST. START DATE</span>
                  <span>Oct 25, 2023</span>
                </div>
                <div className="flex justify-between px-3 py-2">
                  <span className="font-medium text-gray-900">SENT TO DEPT</span>
                  <span>Oct 26, 2023</span>
                </div>
                <div className="flex justify-between px-3 py-2">
                  <span className="font-medium text-[#b01622]">PROMISED DUE DATE</span>
                  <span className="font-bold text-[#b01622]">Nov 15, 2023</span>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <i className="fa-solid fa-pen-nib text-[#b01622] text-xs"></i>
                <h3 className="text-xs font-bold text-[#b01622] uppercase tracking-wider">Design Reference</h3>
              </div>
              
              <div className="border border-gray-200 border-dashed rounded p-1 h-[126px] bg-gray-50 flex items-center justify-center overflow-hidden relative">
                <img src="https://images.unsplash.com/photo-1599643478524-fb66f70a0066?auto=format&fit=crop&w=600&q=80" alt="Bridal Necklace" className="h-full w-auto object-cover opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/90"></div>
                
                <div className="absolute right-0 top-0 bottom-0 w-1/2 p-2 text-[5px] text-gray-800 leading-tight">
                  <div className="font-bold mb-1">CUSTOMER SPECIFICS</div>
                  Necklace length: 18 inches<br />
                  Setting type: Prong<br />
                  Finish: High Polish<br />
                  <br />
                  <div className="font-bold mb-1">ORDER SPECIFICATIONS</div>
                  Stone details: VS1 Diamond<br />
                  Weight margin: +/- 2%<br />
                  Hallmark: BIS 916<br />
                  <br />
                  Ensure clasp is secure and double-checked.
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <i className="fa-solid fa-scroll text-[#b01622] text-xs"></i>
              <h3 className="text-xs font-bold text-[#b01622] uppercase tracking-wider">Crafting Instructions</h3>
            </div>
            
            <div className="border border-gray-200 rounded p-4 text-xs text-gray-800 leading-relaxed bg-white">
              Ensure the center Ruby setting is double-checked for security using 6-prong layout. - Filigree work on the side wings must be delicate but structurally sound for 124g weight. - High-polish finish requested on the inner curve of the necklace for wearer comfort. - Laser hallmark required on the clasp mechanism. - No heat treatment to be applied near the emerald accent beads.
            </div>
          </div>

          <div className="bg-[#7a0f16] text-white rounded grid grid-cols-4 divide-x divide-[#9a1620] py-3 mt-4">
            <div className="text-center">
              <div className="text-[8px] font-medium tracking-wider uppercase mb-1 text-red-200">ALLOCATED GOLD</div>
              <div className="text-lg font-bold">124.50g</div>
            </div>
            <div className="text-center">
              <div className="text-[8px] font-medium tracking-wider uppercase mb-1 text-red-200">STONE COUNT</div>
              <div className="text-lg font-bold">55 Pcs</div>
            </div>
            <div className="text-center">
              <div className="text-[8px] font-medium tracking-wider uppercase mb-1 text-red-200">TOTAL CARATS</div>
              <div className="text-lg font-bold">14.10 ct</div>
            </div>
            <div className="text-center">
              <div className="text-[8px] font-medium tracking-wider uppercase mb-1 text-red-200">EST. WASTAGE</div>
              <div className="text-lg font-bold">4.20%</div>
            </div>
          </div>
        </main>
        
        {/* Footer */}
        <footer className="mt-12 flex justify-between items-end border-t border-gray-300 pt-6">
          <div className="w-1/3">
            <div className="w-48 h-10 mb-2 flex items-center justify-between text-gray-800">
              <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 200 40">
                <rect x="0" y="0" width="4" height="40" fill="black"/>
                <rect x="8" y="0" width="2" height="40" fill="black"/>
                <rect x="14" y="0" width="6" height="40" fill="black"/>
                <rect x="24" y="0" width="2" height="40" fill="black"/>
                <rect x="30" y="0" width="4" height="40" fill="black"/>
                <rect x="38" y="0" width="8" height="40" fill="black"/>
                <rect x="50" y="0" width="2" height="40" fill="black"/>
                <rect x="56" y="0" width="6" height="40" fill="black"/>
                <rect x="66" y="0" width="4" height="40" fill="black"/>
                <rect x="74" y="0" width="2" height="40" fill="black"/>
                <rect x="80" y="0" width="4" height="40" fill="black"/>
                <rect x="88" y="0" width="8" height="40" fill="black"/>
                <rect x="100" y="0" width="2" height="40" fill="black"/>
                <rect x="106" y="0" width="6" height="40" fill="black"/>
                <rect x="116" y="0" width="4" height="40" fill="black"/>
                <rect x="124" y="0" width="2" height="40" fill="black"/>
                <rect x="130" y="0" width="4" height="40" fill="black"/>
                <rect x="138" y="0" width="8" height="40" fill="black"/>
                <rect x="150" y="0" width="2" height="40" fill="black"/>
                <rect x="156" y="0" width="6" height="40" fill="black"/>
                <rect x="166" y="0" width="4" height="40" fill="black"/>
                <rect x="174" y="0" width="2" height="40" fill="black"/>
                <rect x="180" y="0" width="4" height="40" fill="black"/>
                <rect x="188" y="0" width="8" height="40" fill="black"/>
              </svg>
            </div>
            <div className="text-[8px] font-bold text-gray-800 mb-0.5">REF: 884-292-991 | SYSTEM GENERATED DOCUMENT</div>
            <div className="text-[8px] text-gray-500">Generated on: 24 Oct 2023, 11:45 AM by Admin</div>
          </div>
          
          <div className="flex gap-12 text-center w-1/3 justify-end">
            <div>
              <div className="w-32 border-b border-gray-400 mb-2"></div>
              <div className="text-[8px] font-bold text-gray-900">AUTHORIZED SIGNATORY</div>
              <div className="text-[7px] text-gray-500">Inventory Head</div>
            </div>
            <div>
              <div className="w-32 border-b border-gray-400 mb-2"></div>
              <div className="text-[8px] font-bold text-gray-900">ARTISAN ACCEPTANCE</div>
              <div className="text-[7px] text-gray-500">Signature & Date</div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
