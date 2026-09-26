import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../../components/ConfirmModal';
import Pagination from '../../components/Pagination';
import { handleIntegerKeyDown, handleDecimalKeyDown, sanitizeInteger, sanitizeDecimal } from '../../utils/numberInputUtils';

export default function DiamondRanges() {
  const { showToast } = useToast();
  const [ranges, setRanges] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRange, setEditingRange] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: 'DIAMOND',
    code: '',
    item_name: 'DIAMOND',
    stamp: '1',
    part: '-',
    colour: 'D',
    clarity: 'VS',
    remarks: '-',
    unit: 'Carat',
    tunch: '-',
    sale_lb: '-',
    pc: 1,
    wt_ct: 1.000,
    dollar: 0.00,
    disc_percent: 0.00,
    dolx_rate: 0.00,
    rate: 13500,
    description: '',
  });

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchRanges = async () => {
    try {
      setLoading(true);
      const res = await api.get('/diamond-ranges');
      setRanges(res.data || []);
    } catch (err) {
      console.error(err);
      showToast('Failed to load diamond master items', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRanges();
  }, []);

  const openAddModal = () => {
    setEditingRange(null);
    setFormData({
      name: 'DIAMOND',
      code: '',
      item_name: 'DIAMOND',
      stamp: '1',
      part: '-',
      colour: 'D',
      clarity: 'VS',
      remarks: '-',
      unit: 'Carat',
      tunch: '-',
      sale_lb: '-',
      pc: 1,
      wt_ct: 1.000,
      dollar: 0.00,
      disc_percent: 0.00,
      dolx_rate: 0.00,
      rate: 13500,
      description: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingRange(item);
    setFormData({
      name: item.name || 'DIAMOND',
      code: item.code || '',
      item_name: item.item_name || 'DIAMOND',
      stamp: item.stamp || '1',
      part: item.part || '-',
      colour: item.colour || 'D',
      clarity: item.clarity || 'VS',
      remarks: item.remarks || '-',
      unit: item.unit || 'Carat',
      tunch: item.tunch || '-',
      sale_lb: item.sale_lb || '-',
      pc: item.pc || 1,
      wt_ct: item.wt_ct || item.min_ct || 1.000,
      dollar: item.dollar || 0.00,
      disc_percent: item.disc_percent || 0.00,
      dolx_rate: item.dolx_rate || 0.00,
      rate: item.rate || 13500,
      description: item.description || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Please enter a Diamond item name', 'error');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...formData,
        min_ct: formData.wt_ct,
        max_ct: formData.wt_ct,
        value: (Number(formData.wt_ct) || 1) * (Number(formData.rate) || 0)
      };

      if (editingRange) {
        await api.put(`/diamond-ranges/${editingRange.id}`, payload);
        showToast('Diamond Master item updated successfully!', 'success', 'Updated');
      } else {
        await api.post('/diamond-ranges', payload);
        showToast('Diamond Master item created successfully!', 'success', 'Created');
      }
      setIsModalOpen(false);
      fetchRanges();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to save diamond master item';
      showToast(msg, 'error', 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await api.delete(`/diamond-ranges/${deleteTarget.id}`);
      showToast(`Diamond item "${deleteTarget.name}" deleted successfully`, 'success', 'Deleted');
      setDeleteTarget(null);
      fetchRanges();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete diamond item', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="w-full pb-10 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-red-50 text-[#b01622] flex items-center justify-center text-lg shadow-2xs">
              <i className="fa-solid fa-gem"></i>
            </span>
            Diamond Masters Management
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage complete certified Diamond Master specifications (Colour, Clarity, Stamp, Weight, Rate/Ct, and Value).
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#b01622] hover:bg-[#90121b] text-white text-xs font-semibold rounded-xl shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
        >
          <i className="fa-solid fa-plus text-xs"></i>
          Add Diamond Master Item
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-2xs">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Master Diamonds</div>
          <div className="text-2xl font-black text-gray-900">{ranges.length}</div>
          <div className="text-[11px] text-gray-500 mt-1">Configured items in Diamond Masters</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/80 p-4 shadow-2xs">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">D &amp; E Color Diamonds</div>
          <div className="text-2xl font-black text-[#b01622]">
            {ranges.filter(r => ['D', 'E'].includes((r.colour || '').toUpperCase())).length}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">Colorless high grade items</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/80 p-4 shadow-2xs">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">VVS &amp; VS Clarity Items</div>
          <div className="text-2xl font-black text-emerald-700">
            {ranges.filter(r => (r.clarity || '').toUpperCase().includes('VS')).length}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">Fine clarity certified diamonds</div>
        </div>
      </div>

      {/* Table Container matching Image 2 */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-xs">
            <i className="fa-solid fa-circle-notch fa-spin text-lg text-[#b01622] mb-2 block"></i>
            Loading diamond master database...
          </div>
        ) : ranges.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-xs">
            <i className="fa-solid fa-gem text-3xl text-gray-300 mb-3 block"></i>
            No diamond master items configured yet. Click "Add Diamond Master Item" to create one.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-stone-50/80 border-b border-stone-200 text-[10px] font-bold text-stone-500 uppercase tracking-wider whitespace-nowrap">
                    <th className="px-4 py-3">ITEM NAME</th>
                    <th className="px-3 py-3 text-center">STAMP</th>
                    <th className="px-3 py-3 text-center">PART</th>
                    <th className="px-3 py-3 text-center">COLOUR</th>
                    <th className="px-3 py-3 text-center">CLARITY</th>
                    <th className="px-3 py-3">REMARKS</th>
                    <th className="px-3 py-3 text-center">UNIT</th>
                    <th className="px-3 py-3 text-center">PC</th>
                    <th className="px-3 py-3 text-right">WT (CT)</th>
                    <th className="px-3 py-3 text-right">RATE (₹)</th>
                    <th className="px-3 py-3 text-right">VALUE (₹)</th>
                    <th className="px-4 py-3 text-center w-16">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {ranges
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-amber-50/20 transition-colors whitespace-nowrap">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-red-50 text-[#b01622] flex items-center justify-center text-xs shrink-0 font-bold">
                              <i className="fa-solid fa-gem"></i>
                            </span>
                            <div>
                              <div className="font-bold text-gray-900">{item.item_name || item.name || 'DIAMOND'}</div>
                              <div className="text-[10px] text-stone-400 font-mono">{item.code}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center font-mono font-medium text-stone-700">{item.stamp || '1'}</td>
                        <td className="px-3 py-3 text-center text-stone-400">{item.part || '-'}</td>
                        <td className="px-3 py-3 text-center font-bold text-stone-800">{item.colour || 'D'}</td>
                        <td className="px-3 py-3 text-center font-bold text-stone-800">{item.clarity || 'VS'}</td>
                        <td className="px-3 py-3 text-stone-500 max-w-xs truncate">{item.remarks || item.description || '-'}</td>
                        <td className="px-3 py-3 text-center text-stone-600">{item.unit || 'Carat'}</td>
                        <td className="px-3 py-3 text-center font-bold text-stone-900 font-mono">{item.pc || 1}</td>
                        <td className="px-3 py-3 text-right font-mono font-bold text-[#b01622]">
                          {Number(item.wt_ct || item.min_ct || 0).toFixed(3)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-stone-800 font-semibold">
                          ₹ {Number(item.rate || 13500).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-bold text-stone-900">
                          ₹ {Number(item.value || (item.wt_ct || 1) * (item.rate || 13500)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              className="w-7 h-7 rounded-lg text-stone-400 hover:text-stone-800 hover:bg-stone-100 flex items-center justify-center transition-colors cursor-pointer"
                              title="Edit Item"
                            >
                              <i className="fa-solid fa-pen text-xs"></i>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(item)}
                              className="w-7 h-7 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
                              title="Delete Item"
                            >
                              <i className="fa-regular fa-trash-can text-xs"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(ranges.length / itemsPerPage) || 1}
              totalItems={ranges.length}
              itemsPerPage={itemsPerPage}
              onPageChange={(page) => setCurrentPage(page)}
              onItemsPerPageChange={(num) => { setItemsPerPage(num); setCurrentPage(1); }}
            />
          </>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in font-sans">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-stone-200 space-y-4 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 shrink-0">
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <i className={editingRange ? 'fa-solid fa-pen text-[#b01622]' : 'fa-solid fa-plus text-[#b01622]'}></i>
                {editingRange ? 'Edit Diamond Master Item' : 'Add New Diamond Master Item'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 flex items-center justify-center cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs overflow-y-auto pr-1 flex-1">
              {/* Row 1: Item Name & Code */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-600 font-bold mb-1">Item Name <span className="text-[#b01622]">*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.item_name}
                    onChange={(e) => setFormData({ ...formData, item_name: e.target.value, name: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 font-bold mb-1">Code / Identifier</label>
                  <input
                    type="text"
                    placeholder="e.g. DIA-D-VS-101"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl font-mono focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>
              </div>

              {/* Row 2: Stamp, Part, Unit */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-stone-600 font-bold mb-1">Stamp</label>
                  <input
                    type="text"
                    placeholder="e.g. 1"
                    value={formData.stamp}
                    onChange={(e) => setFormData({ ...formData, stamp: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl font-mono focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 font-bold mb-1">Part</label>
                  <input
                    type="text"
                    placeholder="e.g. -"
                    value={formData.part}
                    onChange={(e) => setFormData({ ...formData, part: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 font-bold mb-1">Unit</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-hidden focus:border-[#b01622]"
                  >
                    <option value="Carat">Carat</option>
                    <option value="Pc">Pc</option>
                    <option value="Gram">Gram</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Colour, Clarity, PC */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-stone-600 font-bold mb-1">Colour</label>
                  <select
                    value={formData.colour}
                    onChange={(e) => setFormData({ ...formData, colour: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-hidden focus:border-[#b01622]"
                  >
                    <option value="D">D (Colorless)</option>
                    <option value="E">E (Colorless)</option>
                    <option value="F">F (Colorless)</option>
                    <option value="G">G (Near Colorless)</option>
                    <option value="H">H (Near Colorless)</option>
                    <option value="I">I (Slight Tint)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-stone-600 font-bold mb-1">Clarity</label>
                  <select
                    value={formData.clarity}
                    onChange={(e) => setFormData({ ...formData, clarity: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-hidden focus:border-[#b01622]"
                  >
                    <option value="FL/IF">FL / IF (Flawless)</option>
                    <option value="VVS1">VVS1</option>
                    <option value="VVS2">VVS2</option>
                    <option value="VS">VS (VS1/VS2)</option>
                    <option value="SI1">SI1</option>
                  </select>
                </div>
                <div>
                  <label className="block text-stone-600 font-bold mb-1">Pieces (PC)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={formData.pc}
                    onKeyDown={handleIntegerKeyDown}
                    onChange={(e) => setFormData({ ...formData, pc: sanitizeInteger(e.target.value, false, 1) })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-center font-mono focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>
              </div>

              {/* Row 4: Weight (WT CT), Rate per Carat (₹), Calculated Value */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-stone-600 font-bold mb-1">Weight (WT CT) <span className="text-[#b01622]">*</span></label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.001"
                    required
                    value={formData.wt_ct}
                    onKeyDown={handleDecimalKeyDown}
                    onChange={(e) => setFormData({ ...formData, wt_ct: sanitizeDecimal(e.target.value, false, 3) })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl font-mono font-bold focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 font-bold mb-1">Rate per Carat (₹) <span className="text-[#b01622]">*</span></label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    required
                    value={formData.rate}
                    onKeyDown={handleDecimalKeyDown}
                    onChange={(e) => setFormData({ ...formData, rate: sanitizeDecimal(e.target.value, false, 2) })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl font-mono font-bold focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>
                <div>
                  <label className="block text-stone-500 font-bold mb-1">Calculated Value (₹)</label>
                  <div className="px-3 py-2 bg-stone-100 border border-stone-200 rounded-xl font-mono font-bold text-stone-900 text-xs">
                    ₹ {((Number(formData.wt_ct) || 0) * (Number(formData.rate) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Row 5: Dollar ($), Disc %, Dolx Rate */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-stone-600 font-bold mb-1">Dollar ($)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={formData.dollar}
                    onKeyDown={handleDecimalKeyDown}
                    onChange={(e) => setFormData({ ...formData, dollar: sanitizeDecimal(e.target.value, false, 2) })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl font-mono focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 font-bold mb-1">Disc. %</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={formData.disc_percent}
                    onKeyDown={handleDecimalKeyDown}
                    onChange={(e) => setFormData({ ...formData, disc_percent: sanitizeDecimal(e.target.value, false, 2) })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl font-mono focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 font-bold mb-1">Dolx Rate</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={formData.dolx_rate}
                    onKeyDown={handleDecimalKeyDown}
                    onChange={(e) => setFormData({ ...formData, dolx_rate: sanitizeDecimal(e.target.value, false, 2) })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl font-mono focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>
              </div>

              {/* Row 6: Tunch, Sale LB, Remarks */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-stone-600 font-bold mb-1">Tunch</label>
                  <input
                    type="text"
                    placeholder="e.g. -"
                    value={formData.tunch}
                    onChange={(e) => setFormData({ ...formData, tunch: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 font-bold mb-1">Sale LB</label>
                  <input
                    type="text"
                    placeholder="e.g. -"
                    value={formData.sale_lb}
                    onChange={(e) => setFormData({ ...formData, sale_lb: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 font-bold mb-1">Remarks / Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Certified Solitaire"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value, remarks: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-stone-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 hover:bg-stone-100 text-stone-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-[#b01622] hover:bg-[#8e111a] text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save Diamond Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <ConfirmModal
          isOpen={true}
          title="Delete Diamond Master Item"
          message={`Are you sure you want to delete "${deleteTarget.name}" (${deleteTarget.code})?`}
          confirmLabel="Delete Item"
          confirmVariant="danger"
          loading={deleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
