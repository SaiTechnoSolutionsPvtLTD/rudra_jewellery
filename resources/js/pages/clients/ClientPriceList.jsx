import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../../components/ConfirmModal';

// Baseline Default Template Data
const DEFAULT_PRICE_LIST_DATA = {
  version: '01',
  effective_from: new Date().toISOString().split('T')[0],
  effective_to: 'Open / Till Updated',
  diamond_stone_rates: [
    { id: 1, shape: 'Round Diamond', quality: 'EF-VVS', sieve: '-2', stone_cents: '0.000-0.01', rate_per_ct: 60000 },
    { id: 2, shape: 'Round Diamond', quality: 'EF-VVS', sieve: '(+2 - 6)', stone_cents: '0.011-0.019', rate_per_ct: 60000 },
    { id: 3, shape: 'Round Diamond', quality: 'EF-VVS', sieve: '(+6 - 9)', stone_cents: '0.02-0.05', rate_per_ct: 56000 },
    { id: 4, shape: 'Round Diamond', quality: 'EF-VVS', sieve: '(+9 - 10.5)', stone_cents: '0.06-0.07', rate_per_ct: 58000 },
  ],
  color_stone_charges: [
    { id: 1, stone: 'Navaratna Stones', rate_per_ct: 1800 },
    { id: 2, stone: 'Emerald', rate_per_ct: 2000 },
    { id: 3, stone: 'Onyx', rate_per_ct: 550 },
  ],
  additional_charges: {
    minimum_labour: 1500,
    minimum_labour_desc: 'Per Piece for below 1.00 gms items',
    single_nose_pin: 850,
    single_nose_pin_desc: 'Per Piece',
    multi_stones: 1000,
    multi_stones_desc: 'Per Piece',
    step_nose_pin: 0,
    tongai: 0,
  },
  making_charges: [
    { id: 1, type_design: '22KT: Close Setting', wastage_percent: '6%', labour_charge: 'Rs. 500/- per gms wt', gold_purity: '916', on_wt: '92%' },
    { id: 2, type_design: '18KT: Open Setting', wastage_percent: '6%', labour_charge: 'Rs. 450/- per gms wt', gold_purity: '916', on_wt: '92%' },
    { id: 3, type_design: '18KT: Open / Close', wastage_percent: '6%', labour_charge: 'Rs. 500/- per gms wt', gold_purity: '750', on_wt: '76%' },
  ],
  stamping_instructions: {
    stamping_detail: 'DIA WT.NO OF DIA/ RJ Seal',
    certification: '-',
    hallmark_huid: 'NO',
    metal_colour: '-',
    client_qc_before_billing: 'NO',
    necklace_back_chain: '-',
  },
  payment_terms: [
    { id: 1, type: 'Gold', terms: 'COD' },
    { id: 2, type: 'Diamond', terms: 'COD' },
    { id: 3, type: 'MC', terms: 'COD' },
    { id: 4, type: 'MC', terms: 'COD' },
    { id: 5, type: 'Diamond', terms: 'COD' },
  ],
};

export default function ClientPriceList() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [priceListLoading, setPriceListLoading] = useState(false);

  // Price List Data States
  const [version, setVersion] = useState('01');
  const [status, setStatus] = useState('Active');
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split('T')[0]);
  const [effectiveTo, setEffectiveTo] = useState('Open / Till Updated');
  const [updatedAtStr, setUpdatedAtStr] = useState('');

  const [diamondRates, setDiamondRates] = useState(DEFAULT_PRICE_LIST_DATA.diamond_stone_rates);
  const [colorStoneRates, setColorStoneRates] = useState(DEFAULT_PRICE_LIST_DATA.color_stone_charges);
  const [additionalCharges, setAdditionalCharges] = useState(DEFAULT_PRICE_LIST_DATA.additional_charges);
  const [makingCharges, setMakingCharges] = useState(DEFAULT_PRICE_LIST_DATA.making_charges);
  const [stampingInstructions, setStampingInstructions] = useState(DEFAULT_PRICE_LIST_DATA.stamping_instructions);
  const [paymentTerms, setPaymentTerms] = useState(DEFAULT_PRICE_LIST_DATA.payment_terms);

  // History & Modals
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [activeModalType, setActiveModalType] = useState(null); // 'diamond' | 'color_stone' | 'additional' | 'making' | 'stamping' | 'payment_term'
  const [editingIndex, setEditingIndex] = useState(null);

  // Bulk Import Modal States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Modal Form States
  const [diamondForm, setDiamondForm] = useState({ shape: 'Round Diamond', quality: 'EF-VVS', sieve: '', stone_cents: '', rate_per_ct: '' });
  const [colorStoneForm, setColorStoneForm] = useState({ stone: '', rate_per_ct: '' });
  const [additionalForm, setAdditionalForm] = useState({ ...DEFAULT_PRICE_LIST_DATA.additional_charges });
  const [makingForm, setMakingForm] = useState({ type_design: '', wastage_percent: '', labour_charge: '', gold_purity: '', on_wt: '' });
  const [stampingForm, setStampingForm] = useState({ ...DEFAULT_PRICE_LIST_DATA.stamping_instructions });
  const [paymentTermForm, setPaymentTermForm] = useState({ type: 'Gold', terms: 'COD' });

  // Printable ref for PDF export
  const printRef = useRef(null);

  // Load Client List
  useEffect(() => {
    api.get('/clients')
      .then((res) => {
        const list = res.data.clients || [];
        setClients(list);
        if (id) {
          const match = list.find((c) => String(c.id) === String(id));
          if (match) setSelectedClient(match);
          else if (list.length > 0) setSelectedClient(list[0]);
        } else if (list.length > 0) {
          setSelectedClient(list[0]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading clients:', err);
        setLoading(false);
      });
  }, [id]);

  // Load Price List when selectedClient changes
  useEffect(() => {
    if (!selectedClient) return;

    setPriceListLoading(true);
    api.get(`/clients/${selectedClient.id}/price-list`)
      .then((res) => {
        if (res.data && res.data.price_list) {
          const pl = res.data.price_list;
          setVersion(pl.version || '01');
          setStatus(pl.status ? (pl.status.charAt(0).toUpperCase() + pl.status.slice(1)) : 'Active');
          setEffectiveFrom(pl.effective_from ? String(pl.effective_from).split('T')[0] : new Date().toISOString().split('T')[0]);
          setEffectiveTo(pl.effective_to || 'Open / Till Updated');
          setDiamondRates(pl.diamond_stone_rates?.length ? pl.diamond_stone_rates : DEFAULT_PRICE_LIST_DATA.diamond_stone_rates);
          setColorStoneRates(pl.color_stone_charges?.length ? pl.color_stone_charges : DEFAULT_PRICE_LIST_DATA.color_stone_charges);
          if (pl.additional_charges && Object.keys(pl.additional_charges).length) setAdditionalCharges(pl.additional_charges);
          setMakingCharges(pl.making_charges?.length ? pl.making_charges : DEFAULT_PRICE_LIST_DATA.making_charges);
          if (pl.stamping_instructions && Object.keys(pl.stamping_instructions).length) setStampingInstructions(pl.stamping_instructions);
          setPaymentTerms(pl.payment_terms?.length ? pl.payment_terms : DEFAULT_PRICE_LIST_DATA.payment_terms);

          if (pl.updated_at) {
            const date = new Date(pl.updated_at);
            setUpdatedAtStr(date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' • ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          } else {
            setUpdatedAtStr(new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' • 10:30 AM');
          }
        }
        setPriceListLoading(false);
      })
      .catch((err) => {
        console.error('Error loading price list:', err);
        setPriceListLoading(false);
      });
  }, [selectedClient]);

  // Save current price list to DB
  const handleSavePriceList = async (targetVer = null, overrideData = {}) => {
    if (!selectedClient) return;

    try {
      setSaving(true);
      const versionToUse = targetVer || version;
      const payload = {
        version: versionToUse,
        status: status.toLowerCase(),
        effective_from: effectiveFrom,
        effective_to: effectiveTo,
        diamond_stone_rates: overrideData.diamond_stone_rates !== undefined ? overrideData.diamond_stone_rates : diamondRates,
        color_stone_charges: overrideData.color_stone_charges !== undefined ? overrideData.color_stone_charges : colorStoneRates,
        additional_charges: overrideData.additional_charges !== undefined ? overrideData.additional_charges : additionalCharges,
        making_charges: overrideData.making_charges !== undefined ? overrideData.making_charges : makingCharges,
        stamping_instructions: overrideData.stamping_instructions !== undefined ? overrideData.stamping_instructions : stampingInstructions,
        payment_terms: overrideData.payment_terms !== undefined ? overrideData.payment_terms : paymentTerms,
      };

      const res = await api.post(`/clients/${selectedClient.id}/price-list`, payload);
      if (res.data && res.data.price_list) {
        const pl = res.data.price_list;
        setVersion(pl.version || versionToUse);
        const date = pl.updated_at ? new Date(pl.updated_at) : new Date();
        setUpdatedAtStr(date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' • ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        showToast(`Price list version ${versionToUse} saved successfully!`, 'success', 'Saved');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to save price list', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Create New Version Handler (resets to defaults and increments version)
  const handleCreateNewVersion = () => {
    if (!selectedClient) return;
    const currentNum = parseInt(version, 10) || 1;
    const nextVer = String(currentNum + 1).padStart(2, '0');

    setVersion(nextVer);
    setEffectiveFrom(new Date().toISOString().split('T')[0]);
    setEffectiveTo('Open / Till Updated');
    setDiamondRates(DEFAULT_PRICE_LIST_DATA.diamond_stone_rates);
    setColorStoneRates(DEFAULT_PRICE_LIST_DATA.color_stone_charges);
    setAdditionalCharges(DEFAULT_PRICE_LIST_DATA.additional_charges);
    setMakingCharges(DEFAULT_PRICE_LIST_DATA.making_charges);
    setStampingInstructions(DEFAULT_PRICE_LIST_DATA.stamping_instructions);
    setPaymentTerms(DEFAULT_PRICE_LIST_DATA.payment_terms);

    handleSavePriceList(nextVer, {
      diamond_stone_rates: DEFAULT_PRICE_LIST_DATA.diamond_stone_rates,
      color_stone_charges: DEFAULT_PRICE_LIST_DATA.color_stone_charges,
      additional_charges: DEFAULT_PRICE_LIST_DATA.additional_charges,
      making_charges: DEFAULT_PRICE_LIST_DATA.making_charges,
      stamping_instructions: DEFAULT_PRICE_LIST_DATA.stamping_instructions,
      payment_terms: DEFAULT_PRICE_LIST_DATA.payment_terms,
    });
  };

  // View Version History Modal
  const fetchPriceListHistory = async () => {
    if (!selectedClient) return;
    try {
      setLoadingHistory(true);
      setHistoryModalOpen(true);
      const res = await api.get(`/clients/${selectedClient.id}/price-list/history`);
      if (res.data && res.data.history) {
        setHistoryData(res.data.history);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load version history', 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Restore/View Version from History
  const handleLoadHistoryVersion = (record) => {
    setVersion(record.version || '01');
    setStatus(record.status ? (record.status.charAt(0).toUpperCase() + record.status.slice(1)) : 'Active');
    setEffectiveFrom(record.effective_from ? String(record.effective_from).split('T')[0] : new Date().toISOString().split('T')[0]);
    setEffectiveTo(record.effective_to || 'Open / Till Updated');
    setDiamondRates(record.diamond_stone_rates || DEFAULT_PRICE_LIST_DATA.diamond_stone_rates);
    setColorStoneRates(record.color_stone_charges || DEFAULT_PRICE_LIST_DATA.color_stone_charges);
    if (record.additional_charges) setAdditionalCharges(record.additional_charges);
    setMakingCharges(record.making_charges || DEFAULT_PRICE_LIST_DATA.making_charges);
    if (record.stamping_instructions) setStampingInstructions(record.stamping_instructions);
    setPaymentTerms(record.payment_terms || DEFAULT_PRICE_LIST_DATA.payment_terms);
    setHistoryModalOpen(false);
    showToast(`Loaded Price List version ${record.version}`, 'info', 'Version Loaded');
  };

  // Export to Excel / CSV
  const handleExportExcel = () => {
    if (!selectedClient) return;
    const clientCode = selectedClient.client_code || 'CLIENT';

    let csvContent = `PRICE LIST - ${selectedClient.full_name} (${clientCode})\n`;
    csvContent += `Version: ${version}, Effective From: ${effectiveFrom}, Effective To: ${effectiveTo}\n\n`;

    // 1. Diamond Rates
    csvContent += `1. DIAMOND STONE RATE (PER CARAT)\n`;
    csvContent += `Shape,Quality,Sieve,Stone Cents,Rate / Ct (INR)\n`;
    diamondRates.forEach((r) => {
      csvContent += `"${r.shape}","${r.quality}","${r.sieve}","${r.stone_cents}","${r.rate_per_ct}"\n`;
    });
    csvContent += `\n`;

    // 2. Color Stone Charges
    csvContent += `2. COLOR STONE CHARGES (PER CARAT)\n`;
    csvContent += `Stone,Rate / Ct (INR)\n`;
    colorStoneRates.forEach((cs) => {
      csvContent += `"${cs.stone}","${cs.rate_per_ct}"\n`;
    });
    csvContent += `\n`;

    // 3. Additional Charges
    csvContent += `3. ADDITIONAL CHARGES\n`;
    csvContent += `Charge Name,Amount (INR),Description\n`;
    csvContent += `"Minimum Labour","${additionalCharges.minimum_labour}","${additionalCharges.minimum_labour_desc || ''}"\n`;
    csvContent += `"Single Nose Pin","${additionalCharges.single_nose_pin}","${additionalCharges.single_nose_pin_desc || ''}"\n`;
    csvContent += `"Multi Stones","${additionalCharges.multi_stones}","${additionalCharges.multi_stones_desc || ''}"\n`;
    csvContent += `"Step Nose Pin","${additionalCharges.step_nose_pin}",""\n`;
    csvContent += `"Tongai","${additionalCharges.tongai}",""\n\n`;

    // 4. Making Charges
    csvContent += `4. MAKING CHARGES\n`;
    csvContent += `Type / Design,Wastage (%),Labour Charge,Gold Purity,On Wt\n`;
    makingCharges.forEach((mc) => {
      csvContent += `"${mc.type_design}","${mc.wastage_percent}","${mc.labour_charge}","${mc.gold_purity}","${mc.on_wt}"\n`;
    });
    csvContent += `\n`;

    // 5. Stamping Instructions
    csvContent += `5. STAMPING INSTRUCTIONS\n`;
    csvContent += `Stamping Detail,${stampingInstructions.stamping_detail || '-'}\n`;
    csvContent += `Certification,${stampingInstructions.certification || '-'}\n`;
    csvContent += `Hallmark / HUID,${stampingInstructions.hallmark_huid || '-'}\n`;
    csvContent += `Metal Colour,${stampingInstructions.metal_colour || '-'}\n`;
    csvContent += `Client QC Before Bill,${stampingInstructions.client_qc_before_billing || '-'}\n`;
    csvContent += `Necklace Back Chain,${stampingInstructions.necklace_back_chain || '-'}\n\n`;

    // 6. Payment Terms
    csvContent += `6. PAYMENT TERMS\n`;
    csvContent += `Type,Terms\n`;
    paymentTerms.forEach((pt) => {
      csvContent += `"${pt.type}","${pt.terms}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Price_List_${clientCode}_v${version}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Price List exported to Excel/CSV successfully!', 'success', 'Exported');
  };

  // Export PDF / Print
  const handleExportPDF = () => {
    setIsPdfModalOpen(true);
  };

  // Modals Save Handlers
  const saveDiamondRateItem = () => {
    if (!diamondForm.shape || !diamondForm.rate_per_ct) {
      showToast('Please fill in required diamond rate fields', 'error');
      return;
    }
    let updated;
    if (editingIndex !== null) {
      updated = [...diamondRates];
      updated[editingIndex] = { ...diamondForm, id: updated[editingIndex].id || Date.now() };
    } else {
      updated = [...diamondRates, { ...diamondForm, id: Date.now() }];
    }
    setDiamondRates(updated);
    setActiveModalType(null);
    handleSavePriceList(null, { diamond_stone_rates: updated });
  };

  const saveColorStoneItem = () => {
    if (!colorStoneForm.stone || !colorStoneForm.rate_per_ct) {
      showToast('Please fill in stone name and rate', 'error');
      return;
    }
    let updated;
    if (editingIndex !== null) {
      updated = [...colorStoneRates];
      updated[editingIndex] = { ...colorStoneForm, id: updated[editingIndex].id || Date.now() };
    } else {
      updated = [...colorStoneRates, { ...colorStoneForm, id: Date.now() }];
    }
    setColorStoneRates(updated);
    setActiveModalType(null);
    handleSavePriceList(null, { color_stone_charges: updated });
  };

  const saveMakingChargeItem = () => {
    if (!makingForm.type_design) {
      showToast('Please enter type / design name', 'error');
      return;
    }
    let updated;
    if (editingIndex !== null) {
      updated = [...makingCharges];
      updated[editingIndex] = { ...makingForm, id: updated[editingIndex].id || Date.now() };
    } else {
      updated = [...makingCharges, { ...makingForm, id: Date.now() }];
    }
    setMakingCharges(updated);
    setActiveModalType(null);
    handleSavePriceList(null, { making_charges: updated });
  };

  const saveAdditionalChargesForm = () => {
    setAdditionalCharges(additionalForm);
    setActiveModalType(null);
    handleSavePriceList(null, { additional_charges: additionalForm });
  };

  const saveStampingForm = () => {
    setStampingInstructions(stampingForm);
    setActiveModalType(null);
    handleSavePriceList(null, { stamping_instructions: stampingForm });
  };

  // Bulk Import Handlers
  const handleDownloadSampleTemplate = () => {
    const csvContent = `1. DIAMOND STONE RATE (PER CARAT)
Shape,Quality,Sieve,Stone Cents,Rate / Ct (INR)
Round Diamond,EF-VVS,-2,0.000-0.01,60000
Round Diamond,EF-VVS,(+2 - 6),0.011-0.019,60000
Round Diamond,EF-VVS,(+6 - 9),0.02-0.05,56000
Round Diamond,EF-VVS,(+9 - 10.5),0.06-0.07,58000

2. COLOR STONE CHARGES (PER CARAT)
Stone,Rate / Ct (INR)
Navaratna Stones,1800
Emerald,2000
Onyx,550

3. MAKING CHARGES
Type / Design,Wastage (%),Labour Charge,Gold Purity,On Wt
22KT: Close Setting,6%,Rs. 500/- per gms wt,916,92%
18KT: Open Setting,6%,Rs. 450/- per gms wt,916,92%
18KT: Open / Close,6%,Rs. 500/- per gms wt,750,76%`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Price_List_Import_Template_${selectedClient?.client_code || 'CLIENT'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Sample CSV template downloaded successfully!', 'info');
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setImportFile(e.dataTransfer.files[0]);
    }
  };

  const handleProcessImport = () => {
    if (!importFile) {
      showToast('Please select a file to upload first.', 'error');
      return;
    }

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target.result;
        let importedCount = 0;

        if (importFile.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          if (parsed.diamond_stone_rates) setDiamondRates(parsed.diamond_stone_rates);
          if (parsed.color_stone_charges) setColorStoneRates(parsed.color_stone_charges);
          if (parsed.additional_charges) setAdditionalCharges(parsed.additional_charges);
          if (parsed.making_charges) setMakingCharges(parsed.making_charges);
          if (parsed.stamping_instructions) setStampingInstructions(parsed.stamping_instructions);
          if (parsed.payment_terms) setPaymentTerms(parsed.payment_terms);

          importedCount = (parsed.diamond_stone_rates?.length || 0) + (parsed.color_stone_charges?.length || 0);

          handleSavePriceList(null, {
            diamond_stone_rates: parsed.diamond_stone_rates || diamondRates,
            color_stone_charges: parsed.color_stone_charges || colorStoneRates,
            additional_charges: parsed.additional_charges || additionalCharges,
            making_charges: parsed.making_charges || makingCharges,
            stamping_instructions: parsed.stamping_instructions || stampingInstructions,
            payment_terms: parsed.payment_terms || paymentTerms,
          });
        } else {
          // Process CSV / Excel formatted text
          const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
          const newDiamondRates = [];
          const newColorRates = [];
          let currentSection = null;

          lines.forEach((line) => {
            if (line.includes('1. DIAMOND STONE RATE')) {
              currentSection = 'diamond';
              return;
            } else if (line.includes('2. COLOR STONE CHARGES')) {
              currentSection = 'color';
              return;
            } else if (line.includes('3. MAKING CHARGES') || line.includes('4. ADDITIONAL CHARGES')) {
              currentSection = 'other';
              return;
            }

            if (currentSection === 'diamond' && line.includes(',')) {
              const parts = line.split(',').map((p) => p.replace(/^"|"$/g, '').trim());
              if (parts[0] && parts[0] !== 'Shape' && parts.length >= 5) {
                newDiamondRates.push({
                  id: Date.now() + Math.random(),
                  shape: parts[0],
                  quality: parts[1] || 'EF-VVS',
                  sieve: parts[2] || '-',
                  stone_cents: parts[3] || '0.00',
                  rate_per_ct: parseFloat(parts[4]) || 60000,
                });
              }
            } else if (currentSection === 'color' && line.includes(',')) {
              const parts = line.split(',').map((p) => p.replace(/^"|"$/g, '').trim());
              if (parts[0] && parts[0] !== 'Stone' && parts.length >= 2) {
                newColorRates.push({
                  id: Date.now() + Math.random(),
                  stone: parts[0],
                  rate_per_ct: parseFloat(parts[1]) || 1000,
                });
              }
            }
          });

          const finalDiamond = newDiamondRates.length > 0 ? newDiamondRates : diamondRates;
          const finalColor = newColorRates.length > 0 ? newColorRates : colorStoneRates;

          if (newDiamondRates.length > 0) setDiamondRates(newDiamondRates);
          if (newColorRates.length > 0) setColorStoneRates(newColorRates);

          importedCount = newDiamondRates.length + newColorRates.length;

          handleSavePriceList(null, {
            diamond_stone_rates: finalDiamond,
            color_stone_charges: finalColor,
          });
        }

        setIsImporting(false);
        setIsImportModalOpen(false);
        setImportFile(null);
        showToast(`Bulk Price List import successful! ${importedCount > 0 ? `${importedCount} items imported.` : 'Price list updated.'}`, 'success', 'Import Completed');
      } catch (err) {
        console.error('Import parse error:', err);
        setIsImporting(false);
        showToast('Failed to parse price list file. Please check file format.', 'error');
      }
    };

    reader.onerror = () => {
      setIsImporting(false);
      showToast('Error reading uploaded file.', 'error');
    };

    reader.readAsText(importFile);
  };

  if (loading) {
    return (
      <div className="w-full py-16 text-center text-gray-400 text-xs">
        <i className="fa-solid fa-circle-notch fa-spin text-xl text-[#b01622] mb-2 block"></i>
        Loading client price list...
      </div>
    );
  }

  const clientName = selectedClient ? (selectedClient.full_name || selectedClient.name) : 'Select Client';
  const clientCode = selectedClient ? (selectedClient.client_code || selectedClient.code || 'RJ-EL-1024') : 'RJ-EL-1024';
  const clientTier = selectedClient ? (selectedClient.membership_tier || 'ELITE').toUpperCase() : 'ELITE';
  const clientEmail = selectedClient ? (selectedClient.email || 'meera.s@gmail.com') : 'meera.s@gmail.com';
  const clientPhone = selectedClient ? (selectedClient.primary_phone || '+91 98765 43210') : '+91 98765 43210';
  const clientGst = selectedClient?.gst_percentage ? `${selectedClient.gst_percentage}%` : '3% (Default)';

  return (
    <div className="w-full pb-12 font-sans">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 print:hidden">
        <div>
          <div className="text-xs text-gray-400 font-medium mb-1 flex items-center gap-1.5">
            <span>Client Management</span>
            <i className="fa-solid fa-chevron-right text-[9px] text-gray-300"></i>
            <span className="text-[#b01622] font-bold">Price List</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Live Rates &amp; Price List</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-upload text-gray-500"></i>
            IMPORT PRICE LIST
          </button>

          <button
            type="button"
            onClick={handleCreateNewVersion}
            disabled={saving}
            className="px-4 py-2.5 bg-[#b01622] hover:bg-[#90121b] text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <i className="fa-solid fa-plus text-xs"></i>
            CREATE NEW PRICE LIST
          </button>
        </div>
      </div>

      {/* Select Client Banner Card */}
      <div className="bg-[#f9f7f4] rounded-2xl border border-gray-200/80 p-5 mb-6 shadow-2xs print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
          {/* Client Select Box */}
          <div className="md:col-span-2">
            <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">
              SELECT CLIENT
            </label>
            <div className="relative">
              <select
                value={selectedClient?.id || ''}
                onChange={(e) => {
                  const match = clients.find((c) => String(c.id) === String(e.target.value));
                  if (match) setSelectedClient(match);
                }}
                className="w-full pl-10 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 shadow-2xs focus:outline-none focus:border-[#b01622] cursor-pointer appearance-none"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name || c.name} ({c.membership_tier || 'ELITE'})
                  </option>
                ))}
              </select>
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-red-50 text-[#b01622] flex items-center justify-center text-xs font-bold pointer-events-none">
                <i className="fa-solid fa-user"></i>
              </div>
              <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none"></i>
            </div>
            <p className="text-[11px] text-gray-500 mt-1 pl-1">
              {clientEmail} • {clientPhone}
            </p>
          </div>

          {/* Client Code */}
          <div>
            <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">CLIENT CODE</div>
            <div className="text-xs font-bold font-mono text-gray-800">{clientCode}</div>
          </div>

          {/* Client Tier Badge */}
          <div>
            <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">CLIENT TIER</div>
            <span className="inline-block px-3 py-1 rounded-md bg-amber-100 text-amber-900 font-extrabold text-xs tracking-wide">
              {clientTier}
            </span>
          </div>

          {/* Last Updated */}
          <div>
            <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">DEFAULT GST</div>
            <div className="text-xs font-bold text-gray-800 mb-1">{clientGst}</div>
            <div className="text-[10px] text-gray-400 font-medium">{updatedAtStr || '23 Jul 2026 • 10:30 AM'}</div>
          </div>
        </div>
      </div>

      {/* Main Grid Container (Left 2/3 Content, Right 1/3 Sidebar) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" ref={printRef}>
        {/* Left Column Content */}
        <div className="lg:col-span-2 space-y-6">

          {/* 1. Diamond Stone Rate (Per Carat) */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900">1. Diamond Stone Rate</h3>
                <span className="text-[10px] text-gray-400 font-normal">[Per Carat]</span>
              </div>
              <div className="flex items-center gap-2 print:hidden">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="px-3 py-1.5 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700 text-[11px] font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <i className="fa-solid fa-download text-[10px]"></i>
                  Import from Excel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingIndex(null);
                    setDiamondForm({ shape: 'Round Diamond', quality: 'EF-VVS', sieve: '', stone_cents: '', rate_per_ct: '' });
                    setActiveModalType('diamond');
                  }}
                  className="px-3 py-1.5 bg-[#b01622] hover:bg-[#90121b] text-white text-[11px] font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <i className="fa-solid fa-plus text-[10px]"></i>
                  Add Stone Rate
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <th className="px-4 py-3">SHAPE</th>
                    <th className="px-4 py-3">QUALITY</th>
                    <th className="px-4 py-3">SIEVE</th>
                    <th className="px-4 py-3">STONE CENTS</th>
                    <th className="px-4 py-3 font-bold text-gray-900">RATE / CT (₹)</th>
                    <th className="px-4 py-3 text-right print:hidden">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {diamondRates.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3.5 text-gray-700 font-medium">{row.shape}</td>
                      <td className="px-4 py-3.5 text-gray-700 font-medium">{row.quality}</td>
                      <td className="px-4 py-3.5 text-gray-700 font-medium">{row.sieve}</td>
                      <td className="px-4 py-3.5 text-gray-700 font-medium">{row.stone_cents}</td>
                      <td className="px-4 py-3.5 font-bold text-gray-900 font-mono">
                        {Number(row.rate_per_ct).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3.5 text-right print:hidden">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingIndex(idx);
                              setDiamondForm({ ...row });
                              setActiveModalType('diamond');
                            }}
                            className="text-gray-400 hover:text-gray-700 text-xs cursor-pointer"
                          >
                            <i className="fa-solid fa-pen"></i>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = diamondRates.filter((_, i) => i !== idx);
                              setDiamondRates(updated);
                              handleSavePriceList(null, { diamond_stone_rates: updated });
                            }}
                            className="text-gray-400 hover:text-[#b01622] text-xs cursor-pointer"
                          >
                            <i className="fa-regular fa-trash-can"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2.5 bg-gray-50/60 border-t border-gray-100 text-[10px] text-gray-400">
              Showing 1 to {diamondRates.length} of {diamondRates.length} entries
            </div>
          </div>

          {/* Color Stone Charges & 4. Additional Charges (2 Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

            {/* Color Stone Charges */}
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-gray-900">Color Stone Charges</h3>
                  <span className="text-[10px] text-gray-400">[Per Carat]</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingIndex(null);
                    setColorStoneForm({ stone: '', rate_per_ct: '' });
                    setActiveModalType('color_stone');
                  }}
                  className="px-2.5 py-1 border border-rose-200 text-[#b01622] hover:bg-red-50 text-[10px] font-bold rounded-lg transition-colors cursor-pointer print:hidden"
                >
                  + Add Stone
                </button>
              </div>

              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <th className="px-4 py-2.5">STONE</th>
                    <th className="px-4 py-2.5 font-bold text-gray-900">RATE / CT (₹)</th>
                    <th className="px-4 py-2.5 text-right print:hidden">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {colorStoneRates.map((cs, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-gray-700 font-medium">{cs.stone}</td>
                      <td className="px-4 py-3 font-bold text-gray-900 font-mono">
                        {Number(cs.rate_per_ct).toLocaleString('en-IN')} / CT
                      </td>
                      <td className="px-4 py-3 text-right print:hidden">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingIndex(idx);
                              setColorStoneForm({ ...cs });
                              setActiveModalType('color_stone');
                            }}
                            className="text-gray-400 hover:text-gray-700 text-xs cursor-pointer"
                          >
                            <i className="fa-solid fa-pen"></i>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = colorStoneRates.filter((_, i) => i !== idx);
                              setColorStoneRates(updated);
                              handleSavePriceList(null, { color_stone_charges: updated });
                            }}
                            className="text-gray-400 hover:text-[#b01622] text-xs cursor-pointer"
                          >
                            <i className="fa-regular fa-trash-can"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 4. Additional Charges */}
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
                  <h3 className="text-xs font-bold text-gray-900">4. Additional Charges</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setAdditionalForm({ ...additionalCharges });
                      setActiveModalType('additional');
                    }}
                    className="text-[10px] text-[#b01622] font-bold hover:underline cursor-pointer print:hidden"
                  >
                    Edit Charges
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                  <div className="col-span-1">
                    <label className="block text-[9px] font-bold text-gray-400 uppercase">MINIMUM LABOUR</label>
                    <div className="p-2 bg-gray-50 border border-gray-200/70 rounded-lg font-bold text-gray-900 mt-1 font-mono">
                      ₹ {Number(additionalCharges.minimum_labour || 1500).toLocaleString('en-IN')}
                    </div>
                    <span className="text-[8px] text-gray-400 leading-tight block mt-0.5">{additionalCharges.minimum_labour_desc || 'Per Piece for below 1.00 gms items'}</span>
                  </div>

                  <div className="col-span-1">
                    <label className="block text-[9px] font-bold text-gray-400 uppercase">SINGLE NOSE PIN</label>
                    <div className="p-2 bg-gray-50 border border-gray-200/70 rounded-lg font-bold text-gray-900 mt-1 font-mono">
                      ₹ {Number(additionalCharges.single_nose_pin || 850).toLocaleString('en-IN')}
                    </div>
                    <span className="text-[8px] text-gray-400 leading-tight block mt-0.5">{additionalCharges.single_nose_pin_desc || 'Per Piece'}</span>
                  </div>

                  <div className="col-span-1">
                    <label className="block text-[9px] font-bold text-gray-400 uppercase">MULTI STONES</label>
                    <div className="p-2 bg-gray-50 border border-gray-200/70 rounded-lg font-bold text-gray-900 mt-1 font-mono">
                      ₹ {Number(additionalCharges.multi_stones || 1000).toLocaleString('en-IN')}
                    </div>
                    <span className="text-[8px] text-gray-400 leading-tight block mt-0.5">{additionalCharges.multi_stones_desc || 'Per Piece'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[9px] font-bold text-gray-400 uppercase">STEP NOSE PIN</label>
                    <div className="p-2 bg-gray-50 border border-gray-200/70 rounded-lg font-bold text-gray-900 mt-1 font-mono">
                      ₹ {additionalCharges.step_nose_pin ? Number(additionalCharges.step_nose_pin).toLocaleString('en-IN') : '-'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-gray-400 uppercase">TONGAI</label>
                    <div className="p-2 bg-gray-50 border border-gray-200/70 rounded-lg font-bold text-gray-900 mt-1 font-mono">
                      ₹ {additionalCharges.tongai ? Number(additionalCharges.tongai).toLocaleString('en-IN') : '-'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* 3. Making Charges Table */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-900">Making Charges</h3>
              <button
                type="button"
                onClick={() => {
                  setEditingIndex(null);
                  setMakingForm({ type_design: '', wastage_percent: '', labour_charge: '', gold_purity: '', on_wt: '' });
                  setActiveModalType('making');
                }}
                className="px-2.5 py-1 border border-rose-200 text-[#b01622] hover:bg-red-50 text-[10px] font-bold rounded-lg transition-colors cursor-pointer print:hidden"
              >
                + Add Making Charge
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <th className="px-4 py-3">TYPE / DESIGN</th>
                    <th className="px-4 py-3">WASTAGE (%)</th>
                    <th className="px-4 py-3">LABOUR CHARGE</th>
                    <th className="px-4 py-3">GOLD PURITY</th>
                    <th className="px-4 py-3">ON WT</th>
                    <th className="px-4 py-3 text-right print:hidden">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {makingCharges.map((mc, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3.5 text-gray-900 font-bold">{mc.type_design}</td>
                      <td className="px-4 py-3.5 text-gray-700 font-medium">{mc.wastage_percent}</td>
                      <td className="px-4 py-3.5 text-gray-700 font-medium">{mc.labour_charge}</td>
                      <td className="px-4 py-3.5 text-gray-700 font-medium">{mc.gold_purity}</td>
                      <td className="px-4 py-3.5 text-gray-700 font-medium">{mc.on_wt}</td>
                      <td className="px-4 py-3.5 text-right print:hidden">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingIndex(idx);
                              setMakingForm({ ...mc });
                              setActiveModalType('making');
                            }}
                            className="text-gray-400 hover:text-gray-700 text-xs cursor-pointer"
                          >
                            <i className="fa-solid fa-pen"></i>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = makingCharges.filter((_, i) => i !== idx);
                              setMakingCharges(updated);
                              handleSavePriceList(null, { making_charges: updated });
                            }}
                            className="text-gray-400 hover:text-[#b01622] text-xs cursor-pointer"
                          >
                            <i className="fa-regular fa-trash-can"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stamping Instructions & Payment Terms (2 Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

            {/* Instruction for Inscription on Product (Stamping) */}
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3">
                <h3 className="text-xs font-bold text-gray-900">
                  Instruction for Inscription on Product (Stamping)
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setStampingForm({ ...stampingInstructions });
                    setActiveModalType('stamping');
                  }}
                  className="text-[10px] text-[#b01622] font-bold hover:underline cursor-pointer print:hidden"
                >
                  Edit
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 uppercase">STAMPING DETAIL</label>
                  <div className="p-2 bg-gray-50 border border-gray-200/70 rounded-lg text-gray-800 font-medium text-[11px] truncate mt-1">
                    {stampingInstructions.stamping_detail || 'DIA WT/NO OF DIA/ RJ Seal'}
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 uppercase">CERTIFICATION</label>
                  <div className="p-2 bg-gray-50 border border-gray-200/70 rounded-lg text-gray-800 font-medium text-[11px] truncate mt-1">
                    {stampingInstructions.certification || '-'}
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-gray-400 uppercase">HALLMARK / HUID</label>
                  <div className="p-2 bg-gray-50 border border-gray-200/70 rounded-lg text-gray-800 font-medium text-[11px] truncate mt-1">
                    {stampingInstructions.hallmark_huid || 'NO'}
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 uppercase">METAL COLOUR</label>
                  <div className="p-2 bg-gray-50 border border-gray-200/70 rounded-lg text-gray-800 font-medium text-[11px] truncate mt-1">
                    {stampingInstructions.metal_colour || '-'}
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-gray-400 uppercase">CLIENT QC BEFORE BILL</label>
                  <div className="p-2 bg-gray-50 border border-gray-200/70 rounded-lg text-gray-800 font-medium text-[11px] truncate mt-1">
                    {stampingInstructions.client_qc_before_billing || 'NO'}
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 uppercase">NECKLACE BACK CHAIN</label>
                  <div className="p-2 bg-gray-50 border border-gray-200/70 rounded-lg text-gray-800 font-medium text-[11px] truncate mt-1">
                    {stampingInstructions.necklace_back_chain || '-'}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Terms */}
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-900">Payment Terms</h3>
                <button
                  type="button"
                  onClick={() => {
                    setEditingIndex(null);
                    setPaymentTermForm({ type: 'Gold', terms: 'COD' });
                    setActiveModalType('payment_term');
                  }}
                  className="text-[10px] text-[#b01622] font-bold hover:underline cursor-pointer print:hidden"
                >
                  + Add Term
                </button>
              </div>

              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#f8f9fa] border-b border-gray-200 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-2.5">TYPE</th>
                    <th className="px-4 py-2.5">TERMS</th>
                    <th className="px-4 py-2.5 text-right print:hidden">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paymentTerms.map((pt, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-gray-700 font-medium">{pt.type}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">{pt.terms}</td>
                      <td className="px-4 py-3 text-right print:hidden">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = paymentTerms.filter((_, i) => i !== idx);
                            setPaymentTerms(updated);
                            handleSavePriceList(null, { payment_terms: updated });
                          }}
                          className="text-gray-400 hover:text-[#b01622] text-xs cursor-pointer"
                        >
                          <i className="fa-regular fa-trash-can"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>

        </div>

        {/* Right Column Sidebar */}
        <div className="space-y-6 print:hidden">

          {/* Current Active Version Card */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-900 border-b border-gray-100 pb-3">
              <i className="fa-regular fa-bookmark text-[#b01622]"></i>
              <span>Current Active Version</span>
            </div>

            <div>
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">CLIENT</div>
              <div className="text-xs font-bold text-gray-900 mt-0.5">{clientName}</div>
              <div className="text-[10px] text-gray-400 font-mono">Code: {clientCode}</div>
            </div>

            <div className="flex items-center justify-between border-t border-b border-gray-100 py-3">
              <div>
                <div className="text-[10px] text-gray-400 font-bold uppercase">VERSION</div>
                <div className="text-base font-black text-gray-900">{version}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-gray-400 font-bold uppercase">STATUS</div>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">
                  {status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase block">EFFECTIVE FROM</span>
                <span className="font-bold text-gray-800">{effectiveFrom || '01 Aug 2026'}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase block">EFFECTIVE TO</span>
                <span className="font-bold text-gray-800">{effectiveTo}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 text-[10px] text-gray-400 flex items-center justify-between">
              <div>
                <span className="block font-bold uppercase">LAST UPDATED</span>
                <span className="text-gray-600 font-medium">{updatedAtStr || '23 Jul 2026 • 10:30 AM'}</span>
              </div>
              <div className="text-right">
                <span className="block font-bold uppercase">BY</span>
                <span className="text-gray-600 font-medium">Arvind (Admin)</span>
              </div>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-5 space-y-3">
            <div className="text-[10px] font-extrabold text-[#b01622] uppercase tracking-wider mb-2">
              QUICK ACTIONS
            </div>

            {/* Action 1: Create New Version */}
            <button
              type="button"
              onClick={handleCreateNewVersion}
              disabled={saving}
              className="w-full py-2.5 px-4 bg-white border border-rose-200 hover:border-[#b01622] hover:bg-rose-50/50 rounded-xl text-xs font-bold text-[#b01622] flex items-center gap-2.5 transition-all shadow-2xs cursor-pointer"
            >
              <i className="fa-solid fa-copy text-xs"></i>
              <span>Duplicate / Create New Version</span>
            </button>

            {/* Action 2: Export Price List PDF */}
            <button
              type="button"
              onClick={handleExportPDF}
              className="w-full py-2.5 px-4 bg-white border border-rose-200 hover:border-[#b01622] hover:bg-rose-50/50 rounded-xl text-xs font-bold text-[#b01622] flex items-center gap-2.5 transition-all shadow-2xs cursor-pointer"
            >
              <i className="fa-solid fa-file-pdf text-xs"></i>
              <span>Export Price List (PDF)</span>
            </button>

            {/* Action 3: Export to Excel */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="w-full py-2.5 px-4 bg-white border border-rose-200 hover:border-[#b01622] hover:bg-rose-50/50 rounded-xl text-xs font-bold text-[#b01622] flex items-center gap-2.5 transition-all shadow-2xs cursor-pointer"
            >
              <i className="fa-solid fa-file-excel text-xs"></i>
              <span>Export to Excel</span>
            </button>

            {/* Action 4: View Price List History */}
            <button
              type="button"
              onClick={fetchPriceListHistory}
              className="w-full py-2.5 px-4 bg-white border border-rose-200 hover:border-[#b01622] hover:bg-rose-50/50 rounded-xl text-xs font-bold text-[#b01622] flex items-center gap-2.5 transition-all shadow-2xs cursor-pointer"
            >
              <i className="fa-solid fa-clock-rotate-left text-xs"></i>
              <span>View Price List History</span>
            </button>
          </div>

        </div>
      </div>

      {/* Version History Modal */}
      {historyModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in print:hidden">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <i className="fa-solid fa-clock-rotate-left text-[#b01622]"></i>
                Price List Version History ({clientName})
              </h3>
              <button
                type="button"
                onClick={() => setHistoryModalOpen(false)}
                className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            {loadingHistory ? (
              <div className="py-8 text-center text-xs text-gray-400">
                <i className="fa-solid fa-circle-notch fa-spin text-lg text-[#b01622] mb-2 block"></i>
                Loading version history...
              </div>
            ) : historyData.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">
                No past saved versions found.
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1 text-xs">
                {historyData.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3.5 bg-gray-50 border border-gray-200/80 rounded-xl flex items-center justify-between hover:bg-rose-50/30 transition-colors"
                  >
                    <div>
                      <div className="font-bold text-gray-900 flex items-center gap-2">
                        <span>Version {rec.version}</span>
                        {rec.version === version && (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-extrabold text-[9px]">ACTIVE</span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        Effective: {rec.effective_from ? String(rec.effective_from).split('T')[0] : 'N/A'} • {rec.effective_to || 'Open'}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleLoadHistoryVersion(rec)}
                      className="px-3 py-1.5 bg-[#b01622] hover:bg-[#90121b] text-white text-[11px] font-bold rounded-lg cursor-pointer transition-colors"
                    >
                      Load Version
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Export PDF Sheet Preview Modal matching Image 2 UI */}
      {isPdfModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-start justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in print:p-0 print:bg-white print:static">
          {/* Print Style Injector */}
          <style>{`
            @media print {
              @page {
                size: A4 portrait;
                margin: 3mm;
              }
              html, body {
                height: 100% !important;
                overflow: hidden !important;
              }
              body * {
                visibility: hidden !important;
              }
              #printable-price-list-sheet, #printable-price-list-sheet * {
                visibility: visible !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              #printable-price-list-sheet {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-height: 288mm !important;
                margin: 0 !important;
                padding: 4px 10px !important;
                background: white !important;
                z-index: 999999 !important;
                box-shadow: none !important;
                border: none !important;
                overflow: hidden !important;
                page-break-after: avoid !important;
                page-break-inside: avoid !important;
              }
              .no-print {
                display: none !important;
              }

              /* Force exact grid and flex alignments in print renderer */
              .print-grid-top {
                display: grid !important;
                grid-template-columns: 1fr 1fr !important;
                gap: 0.5rem !important;
              }
              .print-grid-main {
                display: grid !important;
                grid-template-columns: 2.1fr 1fr !important;
                gap: 0.75rem !important;
                align-items: start !important;
              }
              .print-col-2 {
                grid-column: span 1 / span 1 !important;
              }
              .print-col-1 {
                grid-column: span 1 / span 1 !important;
              }
              .print-grid-sub {
                display: grid !important;
                grid-template-columns: 1fr 1fr !important;
                gap: 0.5rem !important;
              }
              .print-flex-row {
                display: flex !important;
                flex-direction: row !important;
                align-items: center !important;
                justify-content: space-between !important;
              }
              #printable-price-list-sheet .sheet-watermark-overlay {
                display: flex !important;
                visibility: visible !important;
                opacity: 0.05 !important;
              }
              #printable-price-list-sheet .sheet-watermark-overlay * {
                display: block !important;
                visibility: visible !important;
                color: #6b7280 !important;
              }
            }
          `}</style>

          <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-gray-200 overflow-hidden flex flex-col my-auto max-h-[92vh] print:max-h-none print:border-none print:shadow-none print:w-full">
            {/* Non-printable modal header */}
            <div className="no-print p-4 bg-gray-900 text-white flex items-center justify-between border-b border-gray-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#b01622] text-white flex items-center justify-center font-bold text-xs">
                  <i className="fa-solid fa-file-pdf"></i>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Price List Sheet Preview</h3>
                  <p className="text-[11px] text-gray-400">Version {String(version).padStart(2, '0')} • {clientName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-[#b01622] hover:bg-[#90121b] text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <i className="fa-solid fa-print"></i>
                  <span>PRINT SHEET</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPdfModalOpen(false)}
                  className="w-8 h-8 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <i className="fa-solid fa-xmark text-sm"></i>
                </button>
              </div>
            </div>
            <div className="relative p-5 sm:p-7 overflow-y-auto bg-white font-sans text-gray-900 print:p-0 print:overflow-visible" id="printable-price-list-sheet">
              
              {/* Single Large Subtle Background Watermark Overlay with Name in Grey Colour */}
              <div className="sheet-watermark-overlay absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden select-none z-0 opacity-[0.045] print:opacity-[0.05]">
                <div className="text-[110px] sm:text-[140px] font-black tracking-[0.25em] text-gray-500 uppercase -rotate-[38deg] whitespace-nowrap leading-none">
                  RUDRA JEWELLERS
                </div>
              </div>

              {/* Relative Content Container z-10 */}
              <div className="relative z-10 space-y-3">

                {/* Header section matching Image 2 */}
                <div className="flex flex-row items-center justify-between gap-4 pb-3 border-b border-gray-200 print-flex-row">
                  
                  {/* Left: Rudra Jewellers Website Logo (Only Logo in Bigger Size) */}
                  <div className="flex items-center justify-start shrink-0 min-w-[190px]">
                    <img src="/logo.png" alt="Rudra Jewellers" className="w-auto h-16 max-h-20 sm:h-20 object-contain drop-shadow-xs" />
                  </div>

                  {/* Center: PRICE LIST Header & Version Subtitle */}
                  <div className="text-center flex-1">
                    <h1 className="text-xl sm:text-2xl font-black tracking-widest text-[#70111a] uppercase font-serif">PRICE LIST</h1>
                    <p className="text-[11px] font-medium text-gray-600 mt-0.5">Price List - {String(version).padStart(2, '0')}</p>
                    <div className="flex items-center justify-center gap-2 text-[#70111a] opacity-50 text-[9px] mt-0.5">
                      <span>───────</span>
                      <span>◆</span>
                      <span>───────</span>
                    </div>
                  </div>

                  {/* Right: Print Sheet button indicator & Date/Time */}
                  <div className="flex flex-col items-end justify-center shrink-0">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="no-print border border-[#70111a] hover:bg-[#70111a]/5 text-[#70111a] font-extrabold text-[11px] px-3 py-1 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <i className="fa-solid fa-print text-[10px]"></i>
                      PRINT SHEET
                    </button>
                    <div className="text-[9px] font-mono text-gray-500 tracking-tight mt-1 uppercase text-right">
                      <span>DATE : {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      <span className="mx-1 font-sans text-gray-300">|</span>
                      <span>TIME : {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                    </div>
                  </div>
                </div>

                {/* Cards Grid: Client Details & Dates / Status */}
                <div className="grid grid-cols-2 gap-3 mt-3 print-grid-top">
                  
                  {/* Client Details Card */}
                  <div className="bg-[#faf9f8] p-2.5 rounded-xl border border-gray-200/80 text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[#70111a] font-extrabold text-[10px] uppercase tracking-wider mb-1">
                      <i className="fa-solid fa-user text-[9px]"></i>
                      <span>CLIENT DETAILS</span>
                    </div>
                    <div className="grid grid-cols-3 gap-x-2 gap-y-1 text-[11px]">
                      <span className="text-gray-500 font-medium">Client Name</span>
                      <span className="col-span-2 font-bold text-gray-900">: {clientName} ({clientTier})</span>

                      <span className="text-gray-500 font-medium">Client Code</span>
                      <span className="col-span-2 font-bold text-gray-900 font-mono">: {clientCode}</span>

                      <span className="text-gray-500 font-medium">Membership Tier</span>
                      <span className="col-span-2 font-bold text-gray-900">: {clientTier} Member</span>

                      <span className="text-gray-500 font-medium">Email</span>
                      <span className="col-span-2 font-medium text-gray-800 break-all">: {clientEmail}</span>

                      <span className="text-gray-500 font-medium">Phone</span>
                      <span className="col-span-2 font-medium text-gray-800">: {clientPhone}</span>
                    </div>
                  </div>

                  {/* Dates & Status Card */}
                  <div className="bg-[#faf9f8] p-2.5 rounded-xl border border-gray-200/80 text-xs space-y-1.5">
                    <div className="grid grid-cols-3 gap-x-2 gap-y-1 text-[11px] pt-0.5">
                      <span className="text-gray-500 font-medium flex items-center gap-1">
                        <i className="fa-regular fa-calendar text-[9px] text-gray-400"></i> STARTING FROM
                      </span>
                      <span className="col-span-2 font-bold text-gray-900">: {effectiveFrom || '01 Aug 2026'}</span>

                      <span className="text-gray-500 font-medium flex items-center gap-1">
                        <i className="fa-regular fa-calendar text-[9px] text-gray-400"></i> ENDING TO
                      </span>
                      <span className="col-span-2 font-bold text-gray-900">: {effectiveTo || '—'}</span>

                      <span className="text-gray-500 font-medium flex items-center gap-1">
                        <i className="fa-solid fa-user-gear text-[9px] text-gray-400"></i> CREATED BY
                      </span>
                      <span className="col-span-2 font-bold text-gray-900 uppercase">: ARVIND SHARMA (SUPER ADMIN)</span>

                      <span className="text-gray-500 font-medium flex items-center gap-1">
                        <i className="fa-solid fa-clock-rotate-left text-[9px] text-gray-400"></i> LAST UPDATED
                      </span>
                      <span className="col-span-2 font-bold text-gray-900">: {updatedAtStr || '30 Jul 2026 10:30 AM'}</span>

                      <span className="text-gray-500 font-medium flex items-center gap-1">
                        <i className="fa-solid fa-rotate text-[9px] text-gray-400"></i> STATUS
                      </span>
                      <span className="col-span-2 font-bold text-emerald-600">: 
                        <span className="ml-1.5 px-2 py-0.5 rounded text-[9px] font-extrabold text-emerald-700 bg-emerald-100/70 inline-block uppercase">
                          {status || 'ACTIVE'}
                        </span>
                      </span>
                    </div>
                  </div>

                </div>

                {/* 2-Column Main Section matching Image 2 */}
                <div className="grid grid-cols-3 gap-3.5 mt-3 items-start print-grid-main">
                  
                  {/* Left Column (2/3 Wide) */}
                  <div className="col-span-2 space-y-3 print-col-2">
                    
                    {/* 1. DIAMOND RATES (per carat) */}
                    <div className="space-y-1">
                      <h3 className="text-xs font-black uppercase tracking-wide text-[#70111a] flex items-center gap-1.5">
                        <i className="fa-solid fa-globe text-[10px] text-[#70111a]"></i>
                        <span>1. DIAMOND RATES <span className="text-[9px] font-normal text-gray-500 uppercase">(per carat)</span></span>
                      </h3>

                      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#f7f5f2] border-b border-gray-200 text-[9px] font-extrabold text-gray-600 uppercase tracking-wider">
                              <th className="py-1.5 px-2.5">SHAPE</th>
                              <th className="py-1.5 px-2.5">QUALITY</th>
                              <th className="py-1.5 px-2.5">SIZE (CT)</th>
                              <th className="py-1.5 px-2.5 text-right">RATE / CT (₹)</th>
                              <th className="py-1.5 px-2.5 text-center">ACTION</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                            {diamondRates.map((r, idx) => (
                              <tr key={idx} className="hover:bg-gray-50/50">
                                <td className="py-1.5 px-2.5 font-semibold text-gray-900">{r.shape || 'Round Diamond'}</td>
                                <td className="py-1.5 px-2.5">{r.quality || 'IF - VVS'}</td>
                                <td className="py-1.5 px-2.5">{r.stone_cents || r.sieve || '0.00 - 0.10'}</td>
                                <td className="py-1.5 px-2.5 text-right font-bold text-gray-900 font-mono">
                                  {Number(r.rate_per_ct || 0).toLocaleString()}
                                </td>
                                <td className="py-1.5 px-2.5 text-center text-gray-400">—</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-[9px] text-gray-400 italic pl-1">* Rates are exclusive of GST and other charges.</p>
                    </div>

                    {/* 2. COLOR STONE & 3. ADDITIONAL CHARGES Grid */}
                    <div className="grid grid-cols-2 gap-3 print-grid-sub">
                      
                      {/* 2. COLOR STONE CHARGES */}
                      <div className="space-y-1">
                        <h3 className="text-xs font-black uppercase tracking-wide text-[#70111a] flex items-center gap-1.5">
                          <i className="fa-solid fa-file-lines text-[10px] text-[#70111a]"></i>
                          <span>2. COLOR STONE CHARGES</span>
                        </h3>
                        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-[#fcecee] border-b border-rose-200/80 text-[9px] font-extrabold text-[#70111a] uppercase tracking-wider">
                                <th className="py-1 px-2.5">TYPE</th>
                                <th className="py-1 px-1.5 text-center">OVERRIDE</th>
                                <th className="py-1 px-2.5 text-right">RATE</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                              {colorStoneRates.map((cs, idx) => (
                                <tr key={idx}>
                                  <td className="py-1 px-2.5 font-semibold text-gray-900">{cs.stone}</td>
                                  <td className="py-1 px-1.5 text-center text-gray-400 font-bold">+</td>
                                  <td className="py-1 px-2.5 text-right font-bold text-gray-900 font-mono">
                                    {Number(cs.rate_per_ct || 0).toLocaleString()} / CT
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div className="py-1 px-2.5 bg-gray-50 border-t border-gray-100 text-[9px] font-bold text-gray-500">
                            View All
                          </div>
                        </div>
                      </div>

                      {/* 3. ADDITIONAL CHARGES */}
                      <div className="space-y-1">
                        <h3 className="text-xs font-black uppercase tracking-wide text-[#70111a] flex items-center gap-1.5">
                          <i className="fa-solid fa-rotate-right text-[10px] text-[#70111a]"></i>
                          <span>3. ADDITIONAL CHARGES</span>
                        </h3>
                        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-[#fcecee] border-b border-rose-200/80 text-[9px] font-extrabold text-[#70111a] uppercase tracking-wider">
                                <th className="py-1 px-2.5">CHARGE TYPE</th>
                                <th className="py-1 px-1.5 text-center">TYPE</th>
                                <th className="py-1 px-2.5 text-right">RATE (₹)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                              <tr>
                                <td className="py-1 px-2.5 font-semibold text-gray-900">Tag Charges</td>
                                <td className="py-1 px-1.5 text-center text-gray-600">Fixed</td>
                                <td className="py-1 px-2.5 text-right font-bold text-gray-900 font-mono">₹ 500</td>
                              </tr>
                              <tr>
                                <td className="py-1 px-2.5 font-semibold text-gray-900">Certificate</td>
                                <td className="py-1 px-1.5 text-center text-gray-600">Fixed</td>
                                <td className="py-1 px-2.5 text-right font-bold text-gray-900 font-mono">₹ 300</td>
                              </tr>
                              <tr>
                                <td className="py-1 px-2.5 font-semibold text-gray-900">Hallmark</td>
                                <td className="py-1 px-1.5 text-center text-gray-600">Fixed</td>
                                <td className="py-1 px-2.5 text-right font-bold text-gray-900 font-mono">₹ 250</td>
                              </tr>
                            </tbody>
                          </table>
                          <div className="py-1 px-2.5 bg-gray-50 border-t border-gray-100 text-[9px] font-bold text-gray-500">
                            View All
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* 4. MAKING CHARGES */}
                    <div className="space-y-1">
                      <h3 className="text-xs font-black uppercase tracking-wide text-[#70111a] flex items-center gap-1.5">
                        <i className="fa-solid fa-rotate-right text-[10px] text-[#70111a]"></i>
                        <span>4. MAKING CHARGES</span>
                      </h3>
                      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#f7f5f2] border-b border-gray-200 text-[9px] font-extrabold text-gray-600 uppercase tracking-wider">
                              <th className="py-1.5 px-2.5">TYPE (CATEGORY)</th>
                              <th className="py-1.5 px-2.5">WASTAGE (%)</th>
                              <th className="py-1.5 px-2.5">LABOUR CHARGE</th>
                              <th className="py-1.5 px-2.5">GOLD PURITY</th>
                              <th className="py-1.5 px-2.5">GST (%)</th>
                              <th className="py-1.5 px-2.5 text-center">ACTION</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                            {makingCharges.map((mc, idx) => (
                              <tr key={idx} className="hover:bg-gray-50/50">
                                <td className="py-1.5 px-2.5 font-semibold text-gray-900">{mc.type_design}</td>
                                <td className="py-1.5 px-2.5 font-bold">{mc.wastage_percent}</td>
                                <td className="py-1.5 px-2.5 font-medium text-gray-800">{mc.labour_charge} *</td>
                                <td className="py-1.5 px-2.5">{mc.gold_purity}</td>
                                <td className="py-1.5 px-2.5 font-bold">18%</td>
                                <td className="py-1.5 px-2.5 text-center text-gray-400">—</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-[9px] text-gray-400 italic pl-1">* Making charges are subject to change without prior notice.</p>
                    </div>

                  </div>

                  {/* Right Column (1/3 Sidebar) */}
                  <div className="col-span-1 space-y-3 print-col-1">
                    
                    {/* PRICE LIST SUMMARY Card */}
                    <div className="bg-white rounded-xl border border-rose-200/90 p-2.5 space-y-2 shadow-2xs relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-extrabold text-[#70111a] uppercase tracking-wider flex items-center gap-1">
                          <i className="fa-solid fa-file-lines text-[10px] text-[#70111a]"></i> PRICE LIST SUMMARY
                        </span>
                      </div>
                      <div>
                        <div className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">CURRENT ACTIVE VERSION</div>
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-black text-gray-900">Price List - {String(version).padStart(2, '0')}</h4>
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold text-emerald-700 bg-emerald-100 uppercase">
                            ACTIVE
                          </span>
                        </div>
                      </div>
                      <div className="pt-1.5 border-t border-gray-100 text-[10px] space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Effective From</span>
                          <span className="font-bold text-gray-900">{effectiveFrom || '01 Aug 2026'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Last Updated</span>
                          <span className="font-bold text-gray-900">{updatedAtStr || '30 Jul 2026 10:30 AM'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Updated By</span>
                          <span className="font-bold text-gray-900">Arvind Sharma</span>
                        </div>
                      </div>
                    </div>

                    {/* 5. INSTRUCTIONS FOR PRICE SETTING ON PRODUCT (STAMPER) */}
                    <div className="bg-[#f8f9fa] rounded-xl border border-gray-200/80 p-2.5 space-y-1.5 shadow-2xs">
                      <h3 className="text-[11px] font-black uppercase tracking-wide text-[#70111a] flex items-center gap-1">
                        <i className="fa-solid fa-file-lines text-[10px] text-[#70111a]"></i>
                        <span>5. INSTRUCTIONS FOR PRICE SETTING</span>
                      </h3>
                      <div className="text-[11px] space-y-1 divide-y divide-gray-200/60 font-medium">
                        <div className="flex justify-between pt-0.5">
                          <span className="text-gray-500 uppercase text-[9px] font-bold">DIAMOND LOSS (%)</span>
                          <span className="font-bold text-gray-900">1.50</span>
                        </div>
                        <div className="flex justify-between pt-0.5">
                          <span className="text-gray-500 uppercase text-[9px] font-bold">STONE LOSS (%)</span>
                          <span className="font-bold text-gray-900">2.00</span>
                        </div>
                        <div className="flex justify-between pt-0.5">
                          <span className="text-gray-500 uppercase text-[9px] font-bold">METAL LOSS (%)</span>
                          <span className="font-bold text-gray-900">1.00</span>
                        </div>
                        <div className="flex justify-between pt-0.5">
                          <span className="text-gray-500 uppercase text-[9px] font-bold">WASTAGE (%)</span>
                          <span className="font-bold text-gray-900">0.00</span>
                        </div>
                        <div className="flex justify-between pt-0.5">
                          <span className="text-gray-500 uppercase text-[9px] font-bold">MIN. CHARGES (₹)</span>
                          <span className="font-bold text-gray-900">500</span>
                        </div>
                        <div className="flex justify-between pt-0.5">
                          <span className="text-gray-500 uppercase text-[9px] font-bold">ROUND OFF (₹)</span>
                          <span className="font-bold text-gray-900">10</span>
                        </div>
                      </div>
                    </div>

                    {/* Payment Terms */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
                      <div className="p-2 font-bold text-[11px] text-gray-900 border-b border-gray-100 bg-[#f8f9fa]">
                        Payment Terms
                      </div>
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#f8f9fa] border-b border-gray-200 text-[9px] font-extrabold text-gray-500 uppercase tracking-wider">
                            <th className="py-1.5 px-2.5">TYPE</th>
                            <th className="py-1.5 px-2.5 text-right">TERMS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-bold text-gray-900">
                          {paymentTerms.map((pt, idx) => (
                            <tr key={idx}>
                              <td className="py-1.5 px-2.5 font-medium text-gray-700">{pt.type}</td>
                              <td className="py-1.5 px-2.5 text-right font-black text-gray-900">{pt.terms}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                  </div>

                </div>

                {/* Bottom Footer Section */}
                <div className="mt-3 pt-2.5 border-t border-gray-200 flex flex-row items-center justify-between gap-4 print-flex-row">
                  
                  {/* Rudra Seal Badge */}
                  <div className="w-13 h-13 rounded-full border-2 border-[#70111a] flex flex-col items-center justify-center text-center p-1 text-[#70111a] shrink-0">
                    <span className="text-[6px] font-extrabold uppercase tracking-tighter">RUDRA JEWELLERS</span>
                    <span className="font-serif font-black text-[11px] leading-tight">RJ</span>
                    <span className="text-[5px] font-extrabold uppercase tracking-tighter">CHENNAI</span>
                  </div>

                  {/* Center text */}
                  <div className="text-center text-[11px] text-gray-500">
                    <p className="font-semibold text-gray-700">Thank you for your trust and continued partnership.</p>
                    <p className="text-[9px] text-gray-400 mt-0.5">This is a system generated price list.</p>
                  </div>

                  {/* Authorized Signature */}
                  <div className="text-center sm:text-right min-w-[160px] shrink-0">
                    <div className="font-serif italic text-lg font-bold text-gray-800 tracking-wider mb-0.5">
                      Rudhra
                    </div>
                    <div className="border-t border-gray-400 pt-0.5">
                      <div className="text-[9px] font-black uppercase text-gray-800 tracking-wider">AUTHORIZED SIGNATURE</div>
                      <div className="text-[8px] text-gray-400">Rudra Jewellers, Chennai</div>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          </div>
        </div>
      )}
      {/* 1. Diamond Modal */}
      {activeModalType === 'diamond' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in print:hidden">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">
                {editingIndex !== null ? 'Edit Diamond Rate' : 'Add Diamond Rate'}
              </h3>
              <button
                type="button"
                onClick={() => setActiveModalType(null)}
                className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Shape</label>
                <input
                  type="text"
                  value={diamondForm.shape}
                  onChange={(e) => setDiamondForm({ ...diamondForm, shape: e.target.value })}
                  placeholder="Round Diamond"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#b01622]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Quality</label>
                  <input
                    type="text"
                    value={diamondForm.quality}
                    onChange={(e) => setDiamondForm({ ...diamondForm, quality: e.target.value })}
                    placeholder="EF-VVS"
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#b01622]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Sieve</label>
                  <input
                    type="text"
                    value={diamondForm.sieve}
                    onChange={(e) => setDiamondForm({ ...diamondForm, sieve: e.target.value })}
                    placeholder="-2 or (+2 - 6)"
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#b01622]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Stone Cents</label>
                <input
                  type="text"
                  value={diamondForm.stone_cents}
                  onChange={(e) => setDiamondForm({ ...diamondForm, stone_cents: e.target.value })}
                  placeholder="0.000-0.01"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#b01622]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Rate / Ct (₹)</label>
                <input
                  type="number"
                  value={diamondForm.rate_per_ct}
                  onChange={(e) => setDiamondForm({ ...diamondForm, rate_per_ct: e.target.value })}
                  placeholder="60000"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-900 font-mono focus:outline-none focus:border-[#b01622]"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setActiveModalType(null)}
                  className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveDiamondRateItem}
                  className="px-5 py-2 bg-[#b01622] hover:bg-[#90121b] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Save Rate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Color Stone Modal */}
      {activeModalType === 'color_stone' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in print:hidden">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">
                {editingIndex !== null ? 'Edit Color Stone' : 'Add Color Stone'}
              </h3>
              <button
                type="button"
                onClick={() => setActiveModalType(null)}
                className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Stone Name</label>
                <input
                  type="text"
                  value={colorStoneForm.stone}
                  onChange={(e) => setColorStoneForm({ ...colorStoneForm, stone: e.target.value })}
                  placeholder="e.g. Ruby / Emerald"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#b01622]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Rate / Ct (₹)</label>
                <input
                  type="number"
                  value={colorStoneForm.rate_per_ct}
                  onChange={(e) => setColorStoneForm({ ...colorStoneForm, rate_per_ct: e.target.value })}
                  placeholder="1800"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-900 font-mono focus:outline-none focus:border-[#b01622]"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setActiveModalType(null)}
                  className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveColorStoneItem}
                  className="px-5 py-2 bg-[#b01622] hover:bg-[#90121b] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Save Stone
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Additional Charges Modal */}
      {activeModalType === 'additional' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in print:hidden">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Edit Additional Charges</h3>
              <button
                type="button"
                onClick={() => setActiveModalType(null)}
                className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Minimum Labour (₹)</label>
                <input
                  type="number"
                  value={additionalForm.minimum_labour}
                  onChange={(e) => setAdditionalForm({ ...additionalForm, minimum_labour: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-900 font-mono focus:outline-none focus:border-[#b01622]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Single Nose Pin (₹)</label>
                <input
                  type="number"
                  value={additionalForm.single_nose_pin}
                  onChange={(e) => setAdditionalForm({ ...additionalForm, single_nose_pin: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-900 font-mono focus:outline-none focus:border-[#b01622]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Multi Stones (₹)</label>
                <input
                  type="number"
                  value={additionalForm.multi_stones}
                  onChange={(e) => setAdditionalForm({ ...additionalForm, multi_stones: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-900 font-mono focus:outline-none focus:border-[#b01622]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Step Nose Pin (₹)</label>
                <input
                  type="number"
                  value={additionalForm.step_nose_pin}
                  onChange={(e) => setAdditionalForm({ ...additionalForm, step_nose_pin: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-900 font-mono focus:outline-none focus:border-[#b01622]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Tongai (₹)</label>
                <input
                  type="number"
                  value={additionalForm.tongai}
                  onChange={(e) => setAdditionalForm({ ...additionalForm, tongai: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-900 font-mono focus:outline-none focus:border-[#b01622]"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setActiveModalType(null)}
                  className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveAdditionalChargesForm}
                  className="px-5 py-2 bg-[#b01622] hover:bg-[#90121b] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Update Charges
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Making Charges Modal */}
      {activeModalType === 'making' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in print:hidden">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">
                {editingIndex !== null ? 'Edit Making Charge' : 'Add Making Charge'}
              </h3>
              <button
                type="button"
                onClick={() => setActiveModalType(null)}
                className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Type / Design</label>
                <input
                  type="text"
                  value={makingForm.type_design}
                  onChange={(e) => setMakingForm({ ...makingForm, type_design: e.target.value })}
                  placeholder="22KT: Close Setting"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#b01622]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Wastage (%)</label>
                  <input
                    type="text"
                    value={makingForm.wastage_percent}
                    onChange={(e) => setMakingForm({ ...makingForm, wastage_percent: e.target.value })}
                    placeholder="6%"
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#b01622]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Labour Charge</label>
                  <input
                    type="text"
                    value={makingForm.labour_charge}
                    onChange={(e) => setMakingForm({ ...makingForm, labour_charge: e.target.value })}
                    placeholder="Rs. 500/- per gms wt"
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#b01622]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Gold Purity</label>
                  <input
                    type="text"
                    value={makingForm.gold_purity}
                    onChange={(e) => setMakingForm({ ...makingForm, gold_purity: e.target.value })}
                    placeholder="916"
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#b01622]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">On Wt</label>
                  <input
                    type="text"
                    value={makingForm.on_wt}
                    onChange={(e) => setMakingForm({ ...makingForm, on_wt: e.target.value })}
                    placeholder="92%"
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#b01622]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setActiveModalType(null)}
                  className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveMakingChargeItem}
                  className="px-5 py-2 bg-[#b01622] hover:bg-[#90121b] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Save Charge
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Stamping Instructions Modal */}
      {activeModalType === 'stamping' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in print:hidden">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Edit Stamping Instructions</h3>
              <button
                type="button"
                onClick={() => setActiveModalType(null)}
                className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Stamping Detail</label>
                <input
                  type="text"
                  value={stampingForm.stamping_detail}
                  onChange={(e) => setStampingForm({ ...stampingForm, stamping_detail: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#b01622]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Certification</label>
                <input
                  type="text"
                  value={stampingForm.certification}
                  onChange={(e) => setStampingForm({ ...stampingForm, certification: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#b01622]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Hallmark / HUID</label>
                  <input
                    type="text"
                    value={stampingForm.hallmark_huid}
                    onChange={(e) => setStampingForm({ ...stampingForm, hallmark_huid: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#b01622]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Metal Colour</label>
                  <input
                    type="text"
                    value={stampingForm.metal_colour}
                    onChange={(e) => setStampingForm({ ...stampingForm, metal_colour: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#b01622]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Client QC Before Billing</label>
                  <input
                    type="text"
                    value={stampingForm.client_qc_before_billing}
                    onChange={(e) => setStampingForm({ ...stampingForm, client_qc_before_billing: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#b01622]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Necklace Back Chain</label>
                  <input
                    type="text"
                    value={stampingForm.necklace_back_chain}
                    onChange={(e) => setStampingForm({ ...stampingForm, necklace_back_chain: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#b01622]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setActiveModalType(null)}
                  className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveStampingForm}
                  className="px-5 py-2 bg-[#b01622] hover:bg-[#90121b] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Update Instructions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Payment Term Modal */}
      {activeModalType === 'payment_term' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in print:hidden">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Add Payment Term</h3>
              <button
                type="button"
                onClick={() => setActiveModalType(null)}
                className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Type</label>
                <input
                  type="text"
                  value={paymentTermForm.type}
                  onChange={(e) => setPaymentTermForm({ ...paymentTermForm, type: e.target.value })}
                  placeholder="Gold / Diamond / MC"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#b01622]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Terms</label>
                <input
                  type="text"
                  value={paymentTermForm.terms}
                  onChange={(e) => setPaymentTermForm({ ...paymentTermForm, terms: e.target.value })}
                  placeholder="COD / 15 Days"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-[#b01622]"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setActiveModalType(null)}
                  className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const updated = [...paymentTerms, { ...paymentTermForm, id: Date.now() }];
                    setPaymentTerms(updated);
                    setActiveModalType(null);
                    handleSavePriceList(null, { payment_terms: updated });
                  }}
                  className="px-5 py-2 bg-[#b01622] hover:bg-[#90121b] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Save Term
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Price List Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in print:hidden">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-[#b01622] flex items-center justify-center text-lg font-bold">
                  <i className="fa-solid fa-file-import"></i>
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Bulk Import Price List</h3>
                  <p className="text-xs text-gray-500">
                    Upload Excel (.xlsx, .csv) or JSON price rates for {selectedClient?.full_name || 'Client'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportFile(null);
                }}
                className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-base"></i>
              </button>
            </div>

            {/* Template Download Alert */}
            <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-lightbulb text-amber-600 text-sm"></i>
                <span>Need format help? Download our pre-formatted sample template.</span>
              </div>
              <button
                type="button"
                onClick={handleDownloadSampleTemplate}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <i className="fa-solid fa-download text-[10px]"></i>
                Sample Template
              </button>
            </div>

            {/* Drag & Drop File Box */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-[#b01622] bg-red-50/40 scale-[0.99]'
                  : importFile
                  ? 'border-emerald-500 bg-emerald-50/30'
                  : 'border-gray-300 hover:border-[#b01622] bg-gray-50/50 hover:bg-red-50/20'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.json"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setImportFile(e.target.files[0]);
                  }
                }}
                className="hidden"
              />

              {importFile ? (
                <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
                  <div className="flex items-center gap-3 overflow-hidden text-left">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg shrink-0">
                      <i className="fa-solid fa-file-csv"></i>
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-gray-900 truncate">{importFile.name}</p>
                      <p className="text-[10px] text-gray-500 font-medium">
                        {(importFile.size / 1024).toFixed(1)} KB • {importFile.type || 'Document'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImportFile(null);
                    }}
                    className="w-8 h-8 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center cursor-pointer shrink-0"
                  >
                    <i className="fa-solid fa-trash-can text-sm"></i>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-red-50 text-[#b01622] mx-auto flex items-center justify-center text-xl font-bold">
                    <i className="fa-solid fa-cloud-arrow-up"></i>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">
                      Click to browse or drag and drop your file here
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Supports Excel (.xlsx, .xls), CSV (.csv), or JSON (.json) up to 10MB
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportFile(null);
                }}
                className="px-4 py-2.5 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!importFile || isImporting}
                onClick={handleProcessImport}
                className="px-5 py-2.5 bg-[#b01622] hover:bg-[#90121b] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2"
              >
                {isImporting ? (
                  <>
                    <i className="fa-solid fa-spinner animate-spin text-xs"></i>
                    Importing...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-check text-xs"></i>
                    Import &amp; Save Price List
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
