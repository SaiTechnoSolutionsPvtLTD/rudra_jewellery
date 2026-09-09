import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function NewWorkOrder() {
  const navigate = useNavigate();
  const [workOrderId, setWorkOrderId] = useState('WO-2024-0012');
  const [artisan, setArtisan] = useState('Rajesh Varma');
  const [category, setCategory] = useState('Necklace');
  const [productType, setProductType] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [clientId, setClientId] = useState('1');
  const [priority, setPriority] = useState('MEDIUM');
  const [instructions, setInstructions] = useState('');

  const [materials, setMaterials] = useState([
    { id: 1, type: '22K Yellow Gold', weight: '0.00', carat: '-', quality: 'N/A' },
    { id: 2, type: 'Round Brilliant Diamond', weight: '-', carat: '1.25', quality: 'VVS1, Excellent' },
  ]);

  const addMaterialRow = () => {
    setMaterials([
      ...materials,
      { id: Date.now(), type: '22K Yellow Gold', weight: '0.00', carat: '-', quality: 'N/A' }
    ]);
  };

  const removeMaterialRow = (id) => {
    setMaterials(materials.filter(m => m.id !== id));
  };

  const handleSave = async () => {
    try {
      await api.post('/jobs', {
        work_order_id: workOrderId,
        artisan,
        category,
        quantity,
        client_id: clientId,
        priority,
        instructions,
        materials
      });
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="w-full pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Create New Work Order</h1>
            <span className="px-2 py-0.5 rounded bg-gray-200 text-gray-700 text-[10px] font-bold tracking-wider">DRAFT</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">Drafting Job #{workOrderId}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleSave} className="px-4 py-2 bg-[#b01622] text-white rounded-md text-sm font-medium hover:bg-[#90121b] shadow-sm flex items-center gap-2 transition-colors">
            <i className="fa-regular fa-floppy-disk text-xs"></i>
            Save Work Order
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form Sections */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Basic Information */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden relative">
            <div className="p-5 border-b border-gray-100 flex items-center gap-2">
              <i className="fa-solid fa-circle-info text-[#b01622]"></i>
              <h2 className="text-sm font-semibold text-gray-900">Basic Information</h2>
            </div>
            
            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Work Order ID</label>
                <input type="text" value={workOrderId} onChange={(e) => setWorkOrderId(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900" readOnly />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Artisan Selection</label>
                <select value={artisan} onChange={(e) => setArtisan(e.target.value)} className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#b01622]">
                  <option>Select Master Artisan</option>
                  <option>Rajesh Varma</option>
                  <option>Amin Khan</option>
                  <option>Mohit Sharma</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Item Type</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#b01622]">
                  <option>Select Category</option>
                  <option>Necklace</option>
                  <option>Ring</option>
                  <option>Earring</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Product Type</label>
                <select value={productType} onChange={(e) => setProductType(e.target.value)} className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#b01622]">
                  <option>Select Product Type</option>
                  <option>Bridal</option>
                  <option>Casual</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Quantity</label>
                <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#b01622]" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Client ID</label>
                <input type="text" value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#b01622]" />
              </div>

              <div className="col-span-1 md:col-span-3 mt-2">
                <label className="block text-xs text-gray-500 mb-1.5">Design Reference</label>
                <div className="border-2 border-dashed border-[#b01622]/30 bg-red-50/30 rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-red-50 transition-colors">
                  <i className="fa-solid fa-cloud-arrow-up text-[#b01622] text-xl mb-2"></i>
                  <div className="text-sm font-medium text-gray-700">Click to upload or drag & drop high-res design sketches</div>
                  <div className="text-[10px] text-gray-400 mt-1">JPEG, PNG or PDF (Max 25MB)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Material Allocation */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-gem text-[#b01622]"></i>
                <h2 className="text-sm font-semibold text-gray-900">Material Allocation</h2>
              </div>
              <button type="button" onClick={addMaterialRow} className="text-xs text-[#b01622] font-medium"><i className="fa-solid fa-plus mr-1"></i> Add Row</button>
            </div>
            
            <div className="p-5">
              <div className="grid grid-cols-12 gap-3 mb-2 text-xs text-gray-500 font-medium px-2">
                <div className="col-span-4">Material Type</div>
                <div className="col-span-2 text-center">Weight (g)</div>
                <div className="col-span-3 text-center">Carat / Size</div>
                <div className="col-span-2 text-center">Clarity/Cut/Quality</div>
                <div className="col-span-1 text-center">Action</div>
              </div>

              {materials.map((m) => (
                <div key={m.id} className="grid grid-cols-12 gap-3 mb-3 items-center">
                  <div className="col-span-4">
                    <select className="w-full bg-white border border-gray-200 rounded-md px-2 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-[#b01622]">
                      <option>{m.type}</option>
                      <option>22K Yellow Gold</option>
                      <option>Round Brilliant Diamond</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input type="text" defaultValue={m.weight} className="w-full bg-gray-50 text-center border border-gray-200 rounded-md px-2 py-1.5 text-xs text-gray-900" />
                  </div>
                  <div className="col-span-3">
                    <input type="text" defaultValue={m.carat} className="w-full bg-gray-50 text-center border border-gray-200 rounded-md px-2 py-1.5 text-xs text-gray-900" />
                  </div>
                  <div className="col-span-2">
                    <input type="text" defaultValue={m.quality} className="w-full bg-gray-50 text-center border border-gray-200 rounded-md px-2 py-1.5 text-xs text-gray-900" />
                  </div>
                  <div className="col-span-1 text-center">
                    <button type="button" onClick={() => removeMaterialRow(m.id)} className="text-red-500 hover:text-red-700"><i className="fa-regular fa-trash-can"></i></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Production Timeline */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center gap-2">
              <i className="fa-regular fa-calendar text-[#b01622]"></i>
              <h2 className="text-sm font-semibold text-gray-900">Production Timeline</h2>
            </div>
            
            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Estimated Start Date</label>
                <input type="date" className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#b01622]" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Sent Date</label>
                <input type="date" className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#b01622]" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Promised Due Date</label>
                <input type="date" className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#b01622]" />
              </div>
              
              <div className="col-span-1 md:col-span-3 mt-2">
                <label className="block text-xs text-gray-500 mb-1.5">Priority Level</label>
                <div className="inline-flex bg-gray-50 border border-gray-200 rounded-md p-1">
                  <button type="button" onClick={() => setPriority('LOW')} className={`px-4 py-1 text-xs font-semibold rounded transition-colors ${priority === 'LOW' ? 'bg-white font-bold text-gray-900 shadow-sm' : 'text-gray-500'}`}>LOW</button>
                  <button type="button" onClick={() => setPriority('MEDIUM')} className={`px-4 py-1 text-xs font-bold rounded transition-colors ${priority === 'MEDIUM' ? 'bg-white text-yellow-600 shadow-sm' : 'text-gray-500'}`}>MEDIUM</button>
                  <button type="button" onClick={() => setPriority('HIGH')} className={`px-4 py-1 text-xs font-semibold rounded transition-colors ${priority === 'HIGH' ? 'bg-white text-red-600 font-bold shadow-sm' : 'text-gray-500'}`}>HIGH</button>
                </div>
              </div>
            </div>
          </div>

          {/* Crafting Instructions */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center gap-2">
              <i className="fa-solid fa-scroll text-[#b01622]"></i>
              <h2 className="text-sm font-semibold text-gray-900">Crafting Instructions</h2>
            </div>
            
            <div className="p-5">
              <textarea
                rows="3"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#b01622] resize-none"
                placeholder="Specify intricate design nuances, finish preferences (matte vs high polish), or specific stone placement details for the artisan..."
              ></textarea>
            </div>
          </div>

        </div>

        {/* Right Column: Summary & Breakdown */}
        <div className="space-y-6">
          {/* Job Summary */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
            <div className="p-5 border-b border-gray-100 relative z-10">
              <h2 className="text-sm font-semibold text-[#b01622]">Job Summary</h2>
            </div>
            <div className="p-5 space-y-4 relative z-10">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Allocated Gold</span>
                <span className="font-medium text-gray-900">42.50 g</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Stone Count</span>
                <span className="font-medium text-gray-900">12 Pcs</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Total Carats</span>
                <span className="font-medium text-gray-900">1.25 ct</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Est. Wastage</span>
                <span className="font-medium text-gray-900">0.00 g</span>
              </div>
              <div className="pt-4 border-t border-gray-100 flex justify-between items-center text-sm">
                <span className="text-gray-700 font-medium">Est. Material Cost</span>
                <span className="font-bold text-[#b01622]">₹3,42,000</span>
              </div>

              <div className="mt-4 bg-red-50/50 border border-[#b01622]/20 rounded-lg p-3 flex gap-3">
                <i className="fa-solid fa-map-pin text-[#b01622] text-xs mt-0.5"></i>
                <p className="text-[9px] text-gray-600 leading-relaxed">
                  Current gold rate used for estimation: <br />
                  <span className="font-bold text-gray-800">₹7,240/g (22K)</span>. Final cost adjusted upon job completion.
                </p>
              </div>
            </div>
          </div>

          {/* Workflow Step */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">WORKFLOW STEP</h2>
            
            <div className="flex items-center justify-between mb-4 relative">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-px bg-gray-200 z-0"></div>
              
              <div className="relative z-10 w-8 h-8 rounded-full bg-[#b01622] text-white flex items-center justify-center text-xs font-bold border-4 border-white shadow-sm">1</div>
              <div className="relative z-10 w-8 h-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-xs font-bold border-4 border-white shadow-sm">2</div>
              <div className="relative z-10 w-8 h-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-xs font-bold border-4 border-white shadow-sm">3</div>
            </div>
            
            <p className="text-[11px] text-gray-600 leading-relaxed">
              Job drafting is the first stage. Once assigned, stock will be blocked from the main vault.
            </p>
          </div>

          {/* Material Breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">MATERIAL BREAKDOWN</h2>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-600">Gold Value(22K)</span>
                <span className="font-medium text-gray-900">₹ 1,30,050.00</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-600">Making Charges</span>
                <span className="font-medium text-gray-900">₹ 15,000.00</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-600">Stone Charges</span>
                <span className="font-medium text-gray-900">₹ 2,500.00</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-600">Other Charges</span>
                <span className="font-medium text-gray-900">₹ 1,625.00</span>
              </div>
              
              <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                <span className="text-sm font-bold text-gray-900">Total Amount</span>
                <span className="font-bold text-gray-900">₹ 1,49,175.00</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
