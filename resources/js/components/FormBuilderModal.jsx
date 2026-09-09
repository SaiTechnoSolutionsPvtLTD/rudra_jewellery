import React, { useState, useEffect } from 'react';

export default function FormBuilderModal({
  isOpen,
  title = 'Configure Form Fields',
  targetItem = null,
  onSave,
  onClose,
  saving = false
}) {
  const [fields, setFields] = useState([]);
  const [showAddFieldForm, setShowAddFieldForm] = useState(false);
  const [newField, setNewField] = useState({
    label: '',
    key: '',
    type: 'text',
    optionsText: '',
    required: false
  });

  useEffect(() => {
    if (targetItem && targetItem.form_schema && Array.isArray(targetItem.form_schema)) {
      setFields(targetItem.form_schema);
    } else {
      setFields([]);
    }
  }, [targetItem]);

  if (!isOpen || !targetItem) return null;

  const handleAddField = (e) => {
    e.preventDefault();
    if (!newField.label.trim()) return;

    const generatedKey = newField.key.trim()
      ? newField.key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
      : newField.label.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');

    const optionsArray = newField.type === 'select'
      ? newField.optionsText.split(',').map(o => o.trim()).filter(Boolean)
      : [];

    const fieldToAdd = {
      key: generatedKey,
      label: newField.label.trim(),
      type: newField.type,
      options: optionsArray,
      required: newField.required
    };

    setFields(prev => [...prev, fieldToAdd]);
    setNewField({
      label: '',
      key: '',
      type: 'text',
      optionsText: '',
      required: false
    });
    setShowAddFieldForm(false);
  };

  const handleRemoveField = (index) => {
    setFields(prev => prev.filter((_, i) => i !== index));
  };

  const handleLoadTemplate = (templateType) => {
    if (templateType === 'gold') {
      setFields([
        { key: 'purity', label: 'Gold Purity / Karat', type: 'select', options: ['24K (99.9% Pure)', '22K (91.6% Standard)', '18K (75.0% Jewel)', '14K (58.5% Fashion)'], required: true },
        { key: 'gross_weight', label: 'Gross Weight (g)', type: 'number', options: [], required: true },
        { key: 'net_weight', label: 'Net Weight (g)', type: 'number', options: [], required: true },
        { key: 'wastage_percent', label: 'Wastage %', type: 'number', options: [], required: false },
        { key: 'making_charge', label: 'Making Charges (₹)', type: 'number', options: [], required: false },
        { key: 'hallmark_no', label: 'BIS Hallmark Reg No', type: 'text', options: [], required: false }
      ]);
    } else if (templateType === 'silver') {
      setFields([
        { key: 'purity', label: 'Silver Purity', type: 'select', options: ['99.9% Fine Pure', '92.5% Sterling', '80.0% German Silver'], required: true },
        { key: 'weight', label: 'Weight (g)', type: 'number', options: [], required: true },
        { key: 'making_charge', label: 'Making Charges (₹)', type: 'number', options: [], required: false }
      ]);
    } else if (templateType === 'diamond') {
      setFields([
        { key: 'cut', label: 'Diamond Cut', type: 'select', options: ['Round Brilliant', 'Princess Cut', 'Emerald Cut', 'Oval Cut', 'Marquise Cut'], required: true },
        { key: 'clarity', label: 'Clarity', type: 'select', options: ['FL/IF (Flawless)', 'VVS1', 'VVS2', 'VS1', 'SI1'], required: true },
        { key: 'color', label: 'Color Grade', type: 'select', options: ['D-F (Colorless)', 'E-F (Rare White)', 'G-H (Near Colorless)', 'I-J (Slight Yellowish)'], required: true },
        { key: 'carat_weight', label: 'Carat Weight (ct)', type: 'number', options: [], required: true },
        { key: 'piece_count', label: 'Piece Count', type: 'number', options: [], required: false },
        { key: 'metal_setting', label: 'Metal Setting Purity', type: 'text', options: [], required: false }
      ]);
    }
  };

  const handleSave = () => {
    onSave(fields);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-500">Configuring custom form fields for <strong>{targetItem.name}</strong> ({targetItem.code})</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Quick Templates */}
        <div className="mb-5 bg-gray-50 p-3 rounded-xl border border-gray-200/70 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Quick Presets:</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleLoadTemplate('gold')}
              className="px-2.5 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded text-xs font-semibold transition-colors cursor-pointer"
            >
              Gold Preset
            </button>
            <button
              type="button"
              onClick={() => handleLoadTemplate('silver')}
              className="px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 rounded text-xs font-semibold transition-colors cursor-pointer"
            >
              Silver Preset
            </button>
            <button
              type="button"
              onClick={() => handleLoadTemplate('diamond')}
              className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded text-xs font-semibold transition-colors cursor-pointer"
            >
              Diamond Preset
            </button>
            <button
              type="button"
              onClick={() => setFields([])}
              className="px-2.5 py-1 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded text-xs font-semibold transition-colors cursor-pointer"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Fields List */}
        <div className="mb-6 space-y-2.5 max-h-80 overflow-y-auto pr-1">
          {fields.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-xs">
              No custom form fields configured for this category yet.
            </div>
          ) : (
            fields.map((field, idx) => (
              <div key={idx} className="flex items-center justify-between p-3.5 bg-white border border-gray-200 rounded-xl shadow-xs hover:border-[#b01622]/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-50 text-[#b01622] flex items-center justify-center text-xs font-bold shrink-0">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900 flex items-center gap-2">
                      {field.label}
                      {field.required && <span className="text-[10px] bg-red-100 text-red-600 font-semibold px-1.5 py-0.2 rounded">Required</span>}
                    </div>
                    <div className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
                      <span className="font-mono bg-gray-100 px-1.5 py-0.2 rounded text-gray-700">{field.key}</span>
                      <span className="uppercase text-[10px] font-bold text-[#b01622]">{field.type}</span>
                      {field.type === 'select' && field.options && field.options.length > 0 && (
                        <span className="text-gray-400">({field.options.length} options)</span>
                      )}
                    </div>
                    {field.type === 'select' && field.options && (
                      <div className="text-[10px] text-gray-400 mt-1 flex flex-wrap gap-1">
                        {field.options.map((opt, i) => (
                          <span key={i} className="bg-gray-50 border border-gray-200 px-1.5 py-0.2 rounded text-gray-600">{opt}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveField(idx)}
                  className="p-1.5 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                  title="Remove Field"
                >
                  <i className="fa-regular fa-trash-can text-sm"></i>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add New Field Form Toggle */}
        {!showAddFieldForm ? (
          <button
            type="button"
            onClick={() => setShowAddFieldForm(true)}
            className="w-full py-3 bg-red-50 hover:bg-red-100/70 text-[#b01622] text-xs font-bold rounded-xl border border-red-200 flex items-center justify-center gap-2 transition-colors cursor-pointer mb-6"
          >
            <i className="fa-solid fa-plus"></i>
            Add Custom Field / Dropdown
          </button>
        ) : (
          <form onSubmit={handleAddField} className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between text-xs font-bold text-gray-900 border-b border-gray-200 pb-2">
              <span>New Field Details</span>
              <button type="button" onClick={() => setShowAddFieldForm(false)} className="text-gray-400 hover:text-gray-600">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Field Label *</label>
                <input
                  type="text"
                  value={newField.label}
                  onChange={(e) => setNewField(prev => ({ ...prev, label: e.target.value }))}
                  placeholder="e.g. BIS Hallmark License No"
                  required
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Field Key (Optional)</label>
                <input
                  type="text"
                  value={newField.key}
                  onChange={(e) => setNewField(prev => ({ ...prev, key: e.target.value }))}
                  placeholder="e.g. hallmark_no"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Field Type *</label>
                <select
                  value={newField.type}
                  onChange={(e) => setNewField(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs"
                >
                  <option value="text">Text Input</option>
                  <option value="number">Number Input (Weight / Amt)</option>
                  <option value="select">Dropdown Select</option>
                  <option value="textarea">Textarea (Multi-line)</option>
                  <option value="checkbox">Checkbox / Toggle</option>
                </select>
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newField.required}
                    onChange={(e) => setNewField(prev => ({ ...prev, required: e.target.checked }))}
                    className="rounded text-[#b01622] focus:ring-[#b01622]"
                  />
                  Required Field?
                </label>
              </div>
            </div>

            {/* If Type is Select, show Dropdown Options input */}
            {newField.type === 'select' && (
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Dropdown Choices (Comma Separated) *
                </label>
                <input
                  type="text"
                  value={newField.optionsText}
                  onChange={(e) => setNewField(prev => ({ ...prev, optionsText: e.target.value }))}
                  placeholder="e.g. 24K (99.9%), 22K (91.6%), 18K (75.0%)"
                  required
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddFieldForm(false)}
                className="px-3 py-1.5 border border-gray-200 rounded text-xs font-medium text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#b01622] hover:bg-[#90121b] text-white text-xs font-semibold rounded shadow-xs"
              >
                Add Field
              </button>
            </div>
          </form>
        )}

        {/* Modal Footer */}
        <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-[#b01622] hover:bg-[#90121b] text-white rounded-lg text-sm font-semibold shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
          >
            {saving ? (
              <i className="fa-solid fa-circle-notch fa-spin"></i>
            ) : (
              <>
                <i className="fa-solid fa-check"></i>
                Save Form Configuration
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
