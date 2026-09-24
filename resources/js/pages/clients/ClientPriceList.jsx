import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { printElement } from '../../utils/printHelper';

// DIAMOND CHART AND SIEVE SIZE DATASET (Reference from User Chart)
const DIAMOND_CHART_SIZES = [
  { mm: '0.80 mm', sieve: '+0000', weight_ct: '0.0035 ct', num_mm: 0.80 },
  { mm: '0.90 mm', sieve: '+000', weight_ct: '0.0040 ct', num_mm: 0.90 },
  { mm: '1.00 mm', sieve: '+95', weight_ct: '0.0045 ct', num_mm: 1.00 },
  { mm: '1.05 mm', sieve: '+00', weight_ct: '0.0050 ct', num_mm: 1.05 },
  { mm: '1.08 mm', sieve: '+105', weight_ct: '0.0055 ct', num_mm: 1.08 },
  { mm: '1.10 mm', sieve: '+0', weight_ct: '0.0063 ct', num_mm: 1.10 },
  { mm: '1.12 mm', sieve: '+112.5', weight_ct: '0.0069 ct', num_mm: 1.12 },
  { mm: '1.15 mm', sieve: '+1.0', weight_ct: '0.0074 ct', num_mm: 1.15 },
  { mm: '1.18 mm', sieve: '+1.25', weight_ct: '0.0078 ct', num_mm: 1.18 },
  { mm: '1.20 mm', sieve: '+1.50', weight_ct: '0.0083 ct', num_mm: 1.20 },
  { mm: '1.22 mm', sieve: '+1.75', weight_ct: '0.0087 ct', num_mm: 1.22 },
  { mm: '1.25 mm', sieve: '+2.0', weight_ct: '0.0091 ct', num_mm: 1.25 },
  { mm: '1.28 mm', sieve: '+2.25', weight_ct: '0.0096 ct', num_mm: 1.28 },
  { mm: '1.30 mm', sieve: '+2.50', weight_ct: '0.0103 ct', num_mm: 1.30 },
  { mm: '1.32 mm', sieve: '+2.75', weight_ct: '0.0108 ct', num_mm: 1.32 },
  { mm: '1.35 mm', sieve: '+3.0', weight_ct: '0.0115 ct', num_mm: 1.35 },
  { mm: '1.38 mm', sieve: '+3.25', weight_ct: '0.0125 ct', num_mm: 1.38 },
  { mm: '1.40 mm', sieve: '+3.50', weight_ct: '0.0135 ct', num_mm: 1.40 },
  { mm: '1.42 mm', sieve: '+3.75', weight_ct: '0.0140 ct', num_mm: 1.42 },
  { mm: '1.45 mm', sieve: '+4.0', weight_ct: '0.0145 ct', num_mm: 1.45 },
  { mm: '1.48 mm', sieve: '+4.25', weight_ct: '0.0154 ct', num_mm: 1.48 },
  { mm: '1.50 mm', sieve: '+4.50', weight_ct: '0.0159 ct', num_mm: 1.50 },
  { mm: '1.52 mm', sieve: '+4.75', weight_ct: '0.0165 ct', num_mm: 1.52 },
  { mm: '2.20 mm', sieve: '+8.50', weight_ct: '0.0464 ct', num_mm: 2.20 },
  { mm: '2.25 mm', sieve: '+8.75', weight_ct: '0.0480 ct', num_mm: 2.25 },
  { mm: '2.30 mm', sieve: '+9.0', weight_ct: '0.0540 ct', num_mm: 2.30 },
  { mm: '2.35 mm', sieve: '+9.25', weight_ct: '0.0550 ct', num_mm: 2.35 },
  { mm: '2.40 mm', sieve: '+9.50', weight_ct: '0.0618 ct', num_mm: 2.40 },
  { mm: '2.45 mm', sieve: '+9.75', weight_ct: '0.0630 ct', num_mm: 2.45 },
  { mm: '2.50 mm', sieve: '+10.0', weight_ct: '0.0655 ct', num_mm: 2.50 },
  { mm: '2.55 mm', sieve: '+10.25', weight_ct: '0.0690 ct', num_mm: 2.55 },
  { mm: '2.60 mm', sieve: '+10.50', weight_ct: '0.0726 ct', num_mm: 2.60 },
  { mm: '2.65 mm', sieve: '+10.75', weight_ct: '0.0745 ct', num_mm: 2.65 },
  { mm: '2.70 mm', sieve: '+11.0', weight_ct: '0.0800 ct', num_mm: 2.70 },
  { mm: '2.75 mm', sieve: '+11.25', weight_ct: '0.0850 ct', num_mm: 2.75 },
  { mm: '2.80 mm', sieve: '+11.50', weight_ct: '0.0910 ct', num_mm: 2.80 },
  { mm: '2.85 mm', sieve: '+11.75', weight_ct: '0.0950 ct', num_mm: 2.85 },
  { mm: '2.90 mm', sieve: '+12.0', weight_ct: '0.1020 ct', num_mm: 2.90 },
  { mm: '2.95 mm', sieve: '+12.25', weight_ct: '0.1083 ct', num_mm: 2.95 },
  { mm: '3.00 mm', sieve: '+12.50', weight_ct: '0.1110 ct', num_mm: 3.00 },
  { mm: '3.05 mm', sieve: '+12.75', weight_ct: '0.1150 ct', num_mm: 3.05 },
  { mm: '3.10 mm', sieve: '+13.0', weight_ct: '0.1200 ct', num_mm: 3.10 },
  { mm: '3.15 mm', sieve: '+13.25', weight_ct: '0.1290 ct', num_mm: 3.15 },
  { mm: '3.20 mm', sieve: '+13.50', weight_ct: '0.1340 ct', num_mm: 3.20 },
  { mm: '3.25 mm', sieve: '+13.75', weight_ct: '0.1417 ct', num_mm: 3.25 },
  { mm: '3.30 mm', sieve: '+14.0', weight_ct: '0.1470 ct', num_mm: 3.30 },
];

export default function ClientPriceList() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [priceListLoading, setPriceListLoading] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Master Diamond Products from Category DIAMOND
  const [masterDiamondProducts, setMasterDiamondProducts] = useState([]);

  // Select2 State for Diamond Product Dropdown
  const [isSelect2Open, setIsSelect2Open] = useState(false);
  const [select2SearchTerm, setSelect2SearchTerm] = useState('');
  const select2Ref = useRef(null);

  // Price List State Sections
  const [version, setVersion] = useState('01');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveTo, setEffectiveTo] = useState('Open / Till Updated');
  const [updatedAtStr, setUpdatedAtStr] = useState('');

  const [goldRates, setGoldRates] = useState([
    { id: 1, purity: '22K (916)', touch: '91.6%', gold_rate: 13299, wastage_percent: 5, making_charge: 650, effective_rate: 14614 },
    { id: 2, purity: '24K (999)', touch: '99.9%', gold_rate: 14508, wastage_percent: 0, making_charge: 250, effective_rate: 14758 },
    { id: 3, purity: '18K (750)', touch: '75.0%', gold_rate: 10881, wastage_percent: 4, making_charge: 850, effective_rate: 12166 },
    { id: 4, purity: '14K (585)', touch: '58.5%', gold_rate: 8485, wastage_percent: 4, making_charge: 900, effective_rate: 9724 },
  ]);
  const [diamondRates, setDiamondRates] = useState([]);
  const [colorStoneRates, setColorStoneRates] = useState([]);
  const [additionalCharges, setAdditionalCharges] = useState({
    minimum_labour: 1500,
    minimum_labour_desc: 'Per Piece for Below 1.00 gms items',
    single_nose_pin: 850,
    single_nose_pin_desc: 'Per Piece',
    multi_stones: 1000,
    multi_stones_desc: 'Per Piece',
    step_nose_pin: 0,
    tongai: 0,
  });
  const [makingCharges, setMakingCharges] = useState([]);
  const [stampingInstructions, setStampingInstructions] = useState({
    stamping_detail: 'DIA WT/NO OF DIA/ RJ Seal',
    certification: '-',
    hallmark_huid: 'NO',
    metal_colour: '-',
    client_qc_before_billing: 'NO',
    necklace_back_chain: '-',
  });
  const [paymentTerms, setPaymentTerms] = useState([]);

  // Modal State
  const [activeModalType, setActiveModalType] = useState(null); // 'gold' | 'diamond' | 'color_stone' | 'additional' | 'making' | 'stamping' | 'payment_term'
  const [editingItemIndex, setEditingItemIndex] = useState(null);

  // Confirmation Modal State (Edit / Delete Confirmation)
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    type: 'danger' // 'danger' | 'warning' | 'info'
  });

  // Form State for Modals
  const [goldForm, setGoldForm] = useState({
    purity: '22K (916)',
    touch: '91.6%',
    gold_rate: 13299,
    wastage_percent: 5,
    making_charge: 650,
    effective_rate: 14614,
  });

  const [diamondForm, setDiamondForm] = useState({
    product_id: '',
    product_code: '',
    shape: 'Round Diamond',
    quality: 'EF-VVS',
    from_size_index: 0,
    to_size_index: 5,
    size_range_mm: '0.80 mm - 1.10 mm',
    sieve: '+0000 to +0',
    stone_cents: '0.0035 ct - 0.0063 ct',
    rate_per_ct: ''
  });

  const [colorStoneForm, setColorStoneForm] = useState({ stone: '', rate_per_ct: '' });
  const [additionalForm, setAdditionalForm] = useState({ minimum_labour: 1500, single_nose_pin: 850, multi_stones: 1000, step_nose_pin: 0, tongai: 0 });
  const [makingForm, setMakingForm] = useState({ type_design: '', wastage_percent: '', labour_charge: '', gold_purity: '', on_wt: '' });
  const [stampingForm, setStampingForm] = useState({ stamping_detail: '', certification: '', hallmark_huid: '', metal_colour: '', client_qc_before_billing: '', necklace_back_chain: '' });
  const [paymentTermForm, setPaymentTermForm] = useState({ type: 'Gold', terms: 'COD' });

  // Close Select2 when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (select2Ref.current && !select2Ref.current.contains(event.target)) {
        setIsSelect2Open(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load clients list & Master Diamond Products
  useEffect(() => {
    Promise.all([
      api.get('/clients'),
      api.get('/products')
    ]).then(([clientRes, prodRes]) => {
      const clientList = clientRes.data.clients || [];
      setClients(clientList);
      if (id) {
        const match = clientList.find(c => String(c.id) === String(id));
        if (match) setSelectedClient(match);
        else if (clientList.length > 0) setSelectedClient(clientList[0]);
      } else if (clientList.length > 0) {
        setSelectedClient(clientList[0]);
      }

      // Filter products under Category DIAMOND
      const allProds = Array.isArray(prodRes.data) ? prodRes.data : (prodRes.data?.data || []);
      const diamondProds = allProds.filter(p => {
        const catCode = p.category?.code?.toUpperCase() || '';
        const catName = p.category?.name?.toLowerCase() || '';
        return catCode === 'DIAMOND' || catName.includes('diamond');
      });
      setMasterDiamondProducts(diamondProds);
      setLoading(false);
    }).catch(err => {
      console.error('Error loading initial data:', err);
      setLoading(false);
    });
  }, [id]);

  // Keep selectedClient in sync if id param changes
  useEffect(() => {
    if (id && clients.length > 0) {
      const match = clients.find(c => String(c.id) === String(id));
      if (match && match.id !== selectedClient?.id) {
        setSelectedClient(match);
      }
    }
  }, [id, clients]);

  // Load Client Price List whenever selectedClient changes
  useEffect(() => {
    if (!selectedClient) return;

    setPriceListLoading(true);
    api.get(`/clients/${selectedClient.id}/price-list`)
      .then(res => {
        if (res.data && res.data.price_list) {
          const pl = res.data.price_list;
          setVersion(pl.version || '01');
          setEffectiveFrom(pl.effective_from ? pl.effective_from.split('T')[0] : new Date().toISOString().split('T')[0]);
          setEffectiveTo(pl.effective_to || 'Open / Till Updated');
          setGoldRates(pl.gold_rates || [
            { id: 1, purity: '22K (916)', touch: '91.6%', gold_rate: 13299, wastage_percent: 5, making_charge: 650, effective_rate: 14614 },
            { id: 2, purity: '24K (999)', touch: '99.9%', gold_rate: 14508, wastage_percent: 0, making_charge: 250, effective_rate: 14758 },
            { id: 3, purity: '18K (750)', touch: '75.0%', gold_rate: 10881, wastage_percent: 4, making_charge: 850, effective_rate: 12166 },
            { id: 4, purity: '14K (585)', touch: '58.5%', gold_rate: 8485, wastage_percent: 4, making_charge: 900, effective_rate: 9724 },
          ]);
          setDiamondRates(pl.diamond_stone_rates || []);
          setColorStoneRates(pl.color_stone_charges || []);
          if (pl.additional_charges) setAdditionalCharges(pl.additional_charges);
          setMakingCharges(pl.making_charges || []);
          if (pl.stamping_instructions) setStampingInstructions(pl.stamping_instructions);
          setPaymentTerms(pl.payment_terms || []);

          if (pl.updated_at) {
            const date = new Date(pl.updated_at);
            setUpdatedAtStr(date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' • ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          } else {
            setUpdatedAtStr(new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));
          }
        }
        setPriceListLoading(false);
      })
      .catch(err => {
        console.error('Error fetching price list:', err);
        setPriceListLoading(false);
      });
  }, [selectedClient]);

  // Save current price list state to Backend
  const savePriceList = async (customVersion = null, overridePayload = {}) => {
    if (!selectedClient) return;

    try {
      setSaving(true);
      const targetVersion = customVersion || version;
      const payload = {
        version: targetVersion,
        effective_from: effectiveFrom || new Date().toISOString().split('T')[0],
        effective_to: effectiveTo,
        gold_rates: overridePayload.gold_rates !== undefined ? overridePayload.gold_rates : goldRates,
        diamond_stone_rates: overridePayload.diamond_stone_rates !== undefined ? overridePayload.diamond_stone_rates : diamondRates,
        color_stone_charges: overridePayload.color_stone_charges !== undefined ? overridePayload.color_stone_charges : colorStoneRates,
        additional_charges: overridePayload.additional_charges !== undefined ? overridePayload.additional_charges : additionalCharges,
        making_charges: overridePayload.making_charges !== undefined ? overridePayload.making_charges : makingCharges,
        stamping_instructions: overridePayload.stamping_instructions !== undefined ? overridePayload.stamping_instructions : stampingInstructions,
        payment_terms: overridePayload.payment_terms !== undefined ? overridePayload.payment_terms : paymentTerms,
      };

      const res = await api.post(`/clients/${selectedClient.id}/price-list`, payload);
      if (res.data && res.data.price_list) {
        const pl = res.data.price_list;
        setVersion(pl.version || targetVersion);
        if (pl.updated_at) {
          const date = new Date(pl.updated_at);
          setUpdatedAtStr(date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' • ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
        showToast(`Price List saved successfully for ${selectedClient.full_name || selectedClient.name}!`, 'success', 'Saved');
      }
    } catch (err) {
      console.error('Failed to save Price List:', err);
      showToast('Failed to save Price List', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Handlers for Gold Rates
  const handleSaveGoldRate = () => {
    if (!goldForm.purity) {
      showToast('Please select Gold Purity', 'error');
      return;
    }
    if (!goldForm.gold_rate || parseFloat(goldForm.gold_rate) <= 0) {
      showToast('Please enter a valid Gold Rate per gm (₹)', 'error');
      return;
    }

    const gRate = parseFloat(goldForm.gold_rate) || 0;
    const wst = parseFloat(goldForm.wastage_percent) || 0;
    const mCharge = parseFloat(goldForm.making_charge) || 0;
    const effRate = Math.round(gRate * (1 + wst / 100) + mCharge);

    const itemToSave = {
      ...goldForm,
      gold_rate: gRate,
      wastage_percent: wst,
      making_charge: mCharge,
      effective_rate: effRate,
    };

    let updated;
    if (editingItemIndex !== null) {
      updated = [...goldRates];
      updated[editingItemIndex] = { ...itemToSave, id: updated[editingItemIndex].id || Date.now() };
    } else {
      updated = [...goldRates, { ...itemToSave, id: Date.now() }];
    }
    setGoldRates(updated);
    setActiveModalType(null);
    savePriceList(null, { gold_rates: updated });
  };

  const handleDeleteGoldRate = (index) => {
    const updated = goldRates.filter((_, i) => i !== index);
    setGoldRates(updated);
    savePriceList(null, { gold_rates: updated });
  };

  // Dynamic Client Banner Details
  const clientName = selectedClient ? (selectedClient.full_name || selectedClient.name) : 'Select Client';
  const clientTier = selectedClient ? (selectedClient.membership_tier || selectedClient.tier || 'ELITE').toUpperCase() : 'ELITE';
  const clientCode = selectedClient ? (selectedClient.client_code || selectedClient.code || 'RJ-CL-1001') : 'RJ-CL-1001';
  const clientEmail = selectedClient ? selectedClient.email || 'N/A' : 'N/A';
  const clientPhone = selectedClient ? selectedClient.primary_phone || selectedClient.phone || 'N/A' : 'N/A';
  const clientGst = selectedClient
    ? (selectedClient.gst_percentage
        ? (String(selectedClient.gst_percentage).includes('%') ? selectedClient.gst_percentage : `${selectedClient.gst_percentage}%`)
        : (selectedClient.gst_number ? `3% (${selectedClient.gst_number})` : '3% (Default)')
      )
    : '3% (Default)';

  // Select2 Filtered Products List
  const filteredSelect2Products = masterDiamondProducts.filter(p => {
    if (!select2SearchTerm.trim()) return true;
    const term = select2SearchTerm.toLowerCase();
    const nameMatch = (p.name || '').toLowerCase().includes(term);
    const codeMatch = (p.product_code || '').toLowerCase().includes(term);
    const subMatch = (p.subcategory?.name || '').toLowerCase().includes(term);
    return nameMatch || codeMatch || subMatch;
  });

  // Handle Diamond Range Chart Selection change
  const handleRangeChartChange = (fromIdx, toIdx) => {
    const fromItem = DIAMOND_CHART_SIZES[fromIdx] || DIAMOND_CHART_SIZES[0];
    const toItem = DIAMOND_CHART_SIZES[toIdx] || DIAMOND_CHART_SIZES[DIAMOND_CHART_SIZES.length - 1];

    setDiamondForm(prev => ({
      ...prev,
      from_size_index: fromIdx,
      to_size_index: toIdx,
      size_range_mm: `${fromItem.mm} - ${toItem.mm}`,
      sieve: `${fromItem.sieve} to ${toItem.sieve}`,
      stone_cents: `${fromItem.weight_ct} - ${toItem.weight_ct}`
    }));
  };

  // Handlers for Diamond Rates
  const handleSaveDiamondRate = () => {
    if (!diamondForm.shape && !diamondForm.product_id) {
      showToast('Please select a Diamond Product from Master or enter Diamond Shape', 'error');
      return;
    }
    if (!diamondForm.rate_per_ct || parseFloat(diamondForm.rate_per_ct) <= 0) {
      showToast('Please enter a valid Rate / CT (₹)', 'error');
      return;
    }

    let updated;
    if (editingItemIndex !== null) {
      updated = [...diamondRates];
      updated[editingItemIndex] = { ...diamondForm, id: updated[editingItemIndex].id || Date.now() };
    } else {
      updated = [...diamondRates, { ...diamondForm, id: Date.now() }];
    }
    setDiamondRates(updated);
    setActiveModalType(null);
    savePriceList(null, { diamond_stone_rates: updated });
  };

  const handleDeleteDiamondRate = (index) => {
    const updated = diamondRates.filter((_, i) => i !== index);
    setDiamondRates(updated);
    savePriceList(null, { diamond_stone_rates: updated });
  };

  // Handlers for Color Stone Charges
  const handleSaveColorStone = () => {
    if (!colorStoneForm.stone || !colorStoneForm.stone.trim()) {
      showToast('Please enter or select a Stone name', 'error');
      return;
    }

    let updated;
    if (editingItemIndex !== null) {
      updated = [...colorStoneRates];
      updated[editingItemIndex] = { ...colorStoneForm, id: updated[editingItemIndex].id || Date.now() };
    } else {
      updated = [...colorStoneRates, { ...colorStoneForm, id: Date.now() }];
    }
    setColorStoneRates(updated);
    setActiveModalType(null);
    savePriceList(null, { color_stone_charges: updated });
  };

  const handleDeleteColorStone = (index) => {
    const updated = colorStoneRates.filter((_, i) => i !== index);
    setColorStoneRates(updated);
    savePriceList(null, { color_stone_charges: updated });
  };

  // Handlers for Additional Charges
  const handleSaveAdditionalCharges = () => {
    const updated = {
      ...additionalCharges,
      minimum_labour: parseFloat(additionalForm.minimum_labour || 0),
      single_nose_pin: parseFloat(additionalForm.single_nose_pin || 0),
      multi_stones: parseFloat(additionalForm.multi_stones || 0),
      step_nose_pin: parseFloat(additionalForm.step_nose_pin || 0),
      tongai: parseFloat(additionalForm.tongai || 0),
    };
    setAdditionalCharges(updated);
    setActiveModalType(null);
    savePriceList(null, { additional_charges: updated });
  };

  // Handlers for Making Charges
  const handleSaveMakingCharge = () => {
    if (!makingForm.type_design || !makingForm.type_design.trim()) {
      showToast('Please enter Type / Design', 'error');
      return;
    }

    let updated;
    if (editingItemIndex !== null) {
      updated = [...makingCharges];
      updated[editingItemIndex] = { ...makingForm, id: updated[editingItemIndex].id || Date.now() };
    } else {
      updated = [...makingCharges, { ...makingForm, id: Date.now() }];
    }
    setMakingCharges(updated);
    setActiveModalType(null);
    savePriceList(null, { making_charges: updated });
  };

  const handleDeleteMakingCharge = (index) => {
    const updated = makingCharges.filter((_, i) => i !== index);
    setMakingCharges(updated);
    savePriceList(null, { making_charges: updated });
  };

  // Handlers for Stamping Instructions
  const handleSaveStamping = () => {
    setStampingInstructions(stampingForm);
    setActiveModalType(null);
    savePriceList(null, { stamping_instructions: stampingForm });
  };

  // Handlers for Payment Terms
  const handleSavePaymentTerm = () => {
    if (!paymentTermForm.type || !paymentTermForm.type.trim()) {
      showToast('Please enter Payment Term Type', 'error');
      return;
    }

    let updated;
    if (editingItemIndex !== null) {
      updated = [...paymentTerms];
      updated[editingItemIndex] = { ...paymentTermForm, id: updated[editingItemIndex].id || Date.now() };
    } else {
      updated = [...paymentTerms, { ...paymentTermForm, id: Date.now() }];
    }
    setPaymentTerms(updated);
    setActiveModalType(null);
    savePriceList(null, { payment_terms: updated });
  };

  const handleDeletePaymentTerm = (index) => {
    const updated = paymentTerms.filter((_, i) => i !== index);
    setPaymentTerms(updated);
    savePriceList(null, { payment_terms: updated });
  };

  if (loading) {
    return (
      <div className="w-full py-16 text-center text-gray-500">
        <i className="fa-solid fa-circle-notch fa-spin text-2xl text-[#b01622] mb-3"></i>
        <p className="text-sm font-semibold">Loading Client Price List System...</p>
      </div>
    );
  }

  return (
    <div className="w-full pb-24 space-y-5 font-sans text-gray-800">
      
      {/* 1. Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Link to="/clients" className="hover:text-gray-600 transition-colors">Client Management</Link>
            <span className="text-gray-300">›</span>
            <span className="text-[#b01622] font-bold">Price List</span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Live Rates & Price List</h1>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to={`/clients/billing?create=true&client_id=${selectedClient ? selectedClient.id : (id || '')}`}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-md shadow-sm flex items-center gap-2 transition-colors cursor-pointer uppercase tracking-wider"
            title="Generate Invoice for this Client"
          >
            <i className="fa-solid fa-file-invoice-dollar text-xs"></i>
            GENERATE INVOICE
          </Link>
          <button
            type="button"
            onClick={() => setIsPrintModalOpen(true)}
            className="px-4 py-2 bg-white hover:bg-red-50 border border-red-200 text-[#b01622] text-xs font-bold rounded-md shadow-xs flex items-center gap-2 transition-colors cursor-pointer uppercase tracking-wider"
          >
            <i className="fa-solid fa-print text-xs"></i>
            PRINT SHEET
          </button>
          <button
            type="button"
            onClick={() => savePriceList()}
            disabled={saving}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
          >
            {saving ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-regular fa-floppy-disk text-xs"></i>}
            SAVE PRICE LIST
          </button>
          <button
            type="button"
            onClick={() => {
              const nextVer = sprintf('%02d', parseInt(version || '01') + 1);
              savePriceList(nextVer);
            }}
            disabled={saving}
            className="px-4 py-2 bg-[#b01622] hover:bg-[#8e111a] text-white text-xs font-bold rounded-md shadow-sm flex items-center gap-2 transition-colors cursor-pointer uppercase tracking-wider"
          >
            <i className="fa-solid fa-plus text-[11px]"></i>
            CREATE NEW VERSION
          </button>
        </div>
      </div>

      {/* 2. Select Client Banner Box */}
      <div className="bg-[#f3f4f6] rounded-xl p-4 border border-gray-200 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
            SELECT CLIENT
          </div>
          <div className="relative bg-white rounded-lg border border-gray-300 p-2.5 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-100 text-[#b01622] flex items-center justify-center font-bold text-sm shrink-0">
                <i className="fa-regular fa-user"></i>
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  {clientName} <span className="text-gray-500 font-normal">({clientTier})</span>
                </div>
                <div className="text-[11px] text-gray-500">
                  {clientEmail} • {clientPhone}
                </div>
              </div>
            </div>
            {clients.length > 0 ? (
              <select
                value={selectedClient ? selectedClient.id : ''}
                onChange={(e) => {
                  const found = clients.find(c => String(c.id) === e.target.value);
                  if (found) {
                    setSelectedClient(found);
                    navigate(`/clients/${found.id}/price-list`);
                  }
                }}
                className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
              >
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.full_name || c.name} ({c.client_code || c.code})
                  </option>
                ))}
              </select>
            ) : null}
            <i className="fa-solid fa-chevron-up-down text-gray-400 text-xs pointer-events-none mr-1"></i>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 lg:gap-10 text-xs shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-200">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">CLIENT CODE</div>
            <div className="font-mono font-bold text-gray-900 text-xs">{clientCode}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">CLIENT TIER</div>
            <span className="bg-[#ffe0b2] text-[#e65100] text-[10px] font-bold px-2.5 py-0.5 rounded uppercase tracking-wider">
              {clientTier}
            </span>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">DEFAULT GST</div>
            <div className="font-bold text-gray-900 text-xs">{clientGst}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">LAST UPDATED</div>
            <div className="font-semibold text-gray-800 text-xs">{updatedAtStr || 'Today'}</div>
          </div>
        </div>
      </div>

      {priceListLoading && (
        <div className="w-full py-6 text-center text-xs font-semibold text-gray-500">
          <i className="fa-solid fa-spinner fa-spin mr-2 text-[#b01622]"></i> Loading client price list details...
        </div>
      )}

      {/* 3. Main Master Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        
        {/* Main Left Column (Span 2) */}
        <div className="lg:col-span-2 space-y-5">
          
          {/* 1. Gold Rates & Charges (Per GM / Purity) */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
              <div>
                <div className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <span>1. Gold Rates & Charges</span>
                  <span className="text-xs text-gray-400 font-normal">(Per GM / Purity)</span>
                </div>
                <div className="text-[11px] text-amber-800 font-semibold mt-0.5 flex items-center gap-1">
                  <i className="fa-solid fa-coins text-amber-600"></i> Selected Gold Rates ({goldRates.length} Purity Rates Configured)
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingItemIndex(null);
                    setGoldForm({
                      purity: '22K (916)',
                      touch: '91.6%',
                      gold_rate: 13299,
                      wastage_percent: 5,
                      making_charge: 650,
                      effective_rate: 14614,
                    });
                    setActiveModalType('gold');
                  }}
                  className="px-4 py-2 bg-[#b01622] hover:bg-[#8e111a] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <i className="fa-solid fa-plus text-[10px]"></i> Add Gold Rate
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f8f9fa] text-[10px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200">
                    <th className="px-4 py-3">PURITY / METAL</th>
                    <th className="px-4 py-3">TOUCH %</th>
                    <th className="px-4 py-3">WASTAGE (%)</th>
                    <th className="px-4 py-3">MAKING CHARGE</th>
                    <th className="px-4 py-3">ESTIMATED RATE / GM</th>
                    <th className="px-4 py-3 text-center">ACTION</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-gray-100">
                  {goldRates.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-10 text-center text-gray-400">
                        <i className="fa-solid fa-coins text-3xl text-gray-200 mb-2 block"></i>
                        <p className="font-semibold text-gray-600">No gold rates added yet</p>
                        <p className="text-xs text-gray-400 mt-1">Click the <strong className="text-[#b01622]">+ Add Gold Rate</strong> button above to configure gold rates.</p>
                      </td>
                    </tr>
                  ) : (
                    goldRates.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3 font-bold text-gray-900">{item.purity}</td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80">
                            {item.touch || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-700">{item.wastage_percent}%</td>
                        <td className="px-4 py-3 font-mono text-gray-700">₹{Number(item.making_charge || 0).toLocaleString('en-IN')} / gm</td>
                        <td className="px-4 py-3 font-bold text-[#b01622]">₹{Number(item.effective_rate || (item.gold_rate * (1 + (item.wastage_percent || 0)/100) + (item.making_charge || 0))).toLocaleString('en-IN')} / gm</td>
                        <td className="px-4 py-3 text-center text-gray-400 space-x-2">
                          <button
                            onClick={() => {
                              setEditingItemIndex(idx);
                              setGoldForm(item);
                              setActiveModalType('gold');
                            }}
                            className="hover:text-[#b01622] cursor-pointer"
                            title="Edit Gold Rate"
                          >
                            <i className="fa-regular fa-pen-to-square"></i>
                          </button>
                          <button onClick={() => handleDeleteGoldRate(idx)} className="hover:text-red-600 cursor-pointer" title="Delete">
                            <i className="fa-regular fa-trash-can"></i>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-3 bg-white text-[11px] text-gray-500 font-medium border-t border-gray-100 flex items-center justify-between">
              <span>Showing <strong>{goldRates.length}</strong> Gold Purity Rates for this client</span>
              <span className="text-gray-400">Based on Live Market Rates & Wastage Standard</span>
            </div>
          </div>

          {/* 2. Diamond Stone Rate (Per Carat) - Add Stone Rate Workflow */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
              <div>
                <div className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <span>2. Diamond Stone Rate</span>
                  <span className="text-xs text-gray-400 font-normal">(Per Carat)</span>
                </div>
                <div className="text-[11px] text-blue-700 font-semibold mt-0.5 flex items-center gap-1">
                  <i className="fa-solid fa-gem text-blue-500"></i> Selected Diamond Rates ({diamondRates.length} Items Configured)
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingItemIndex(null);
                    setSelect2SearchTerm('');
                    setIsSelect2Open(false);
                    const defaultMaster = masterDiamondProducts[0];
                    setDiamondForm({
                      product_id: defaultMaster ? defaultMaster.id : '',
                      product_code: defaultMaster ? defaultMaster.product_code : '',
                      shape: defaultMaster ? defaultMaster.name : 'Round Diamond',
                      quality: 'EF-VVS',
                      from_size_index: 0,
                      to_size_index: 5,
                      size_range_mm: '0.80 mm - 1.10 mm',
                      sieve: '+0000 to +0',
                      stone_cents: '0.0035 ct - 0.0063 ct',
                      rate_per_ct: defaultMaster ? (defaultMaster.opening_stock_rate || 60000) : 60000
                    });
                    setActiveModalType('diamond');
                  }}
                  className="px-4 py-2 bg-[#b01622] hover:bg-[#8e111a] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <i className="fa-solid fa-plus text-[10px]"></i> Add Stone Rate
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f8f9fa] text-[10px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200">
                    <th className="px-4 py-3">DIAMOND PRODUCT</th>
                    <th className="px-4 py-3">SIZE RANGE (MM)</th>
                    <th className="px-4 py-3">SIEVE RANGE</th>
                    <th className="px-4 py-3">CARAT WEIGHT</th>
                    <th className="px-4 py-3">QUALITY</th>
                    <th className="px-4 py-3">CLIENT RATE / CT (₹)</th>
                    <th className="px-4 py-3 text-center">ACTION</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-gray-100">
                  {diamondRates.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-10 text-center text-gray-400">
                        <i className="fa-solid fa-gem text-3xl text-gray-200 mb-2 block"></i>
                        <p className="font-semibold text-gray-600">No diamond stone rates added yet</p>
                        <p className="text-xs text-gray-400 mt-1">Click the <strong className="text-[#b01622]">+ Add Stone Rate</strong> button above to configure diamond size ranges and client rates.</p>
                      </td>
                    </tr>
                  ) : (
                    diamondRates.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-bold text-gray-900">{item.shape}</div>
                          {item.product_code && (
                            <span className="font-mono text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                              {item.product_code}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-gray-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80">
                            {item.size_range_mm || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700 font-semibold">{item.sieve}</td>
                        <td className="px-4 py-3 font-mono text-gray-600">{item.stone_cents}</td>
                        <td className="px-4 py-3 text-gray-700 font-normal">{item.quality}</td>
                        <td className="px-4 py-3 font-bold text-gray-900">
                          ₹{Number(item.rate_per_ct || 0).toLocaleString('en-IN')} <span className="text-[10px] text-gray-400 font-normal">/ ct</span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-400 space-x-2">
                          <button
                            onClick={() => {
                              setEditingItemIndex(idx);
                              setDiamondForm(item);
                              setIsSelect2Open(false);
                              setSelect2SearchTerm('');
                              setActiveModalType('diamond');
                            }}
                            className="hover:text-[#b01622] cursor-pointer"
                            title="Edit Rate & Size Range"
                          >
                            <i className="fa-regular fa-pen-to-square"></i>
                          </button>
                          <button onClick={() => handleDeleteDiamondRate(idx)} className="hover:text-red-600 cursor-pointer" title="Delete">
                            <i className="fa-regular fa-trash-can"></i>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-3 bg-white text-[11px] text-gray-500 font-medium border-t border-gray-100 flex items-center justify-between">
              <span>Showing <strong>{diamondRates.length}</strong> Diamond Size Ranges for this client</span>
              <span className="text-gray-400">Based on Diamond Chart & Sieve Sizes</span>
            </div>
          </div>

          {/* 3. Color Stone Charges & 4. Additional Charges */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            
            {/* 3. Color Stone Charges */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
                <div>
                  <div className="text-sm font-bold text-gray-900">3. Color Stone Charges</div>
                  <div className="text-[11px] text-gray-400 font-normal">(Per Carat)</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingItemIndex(null);
                    setColorStoneForm({ stone: '', rate_per_ct: '' });
                    setActiveModalType('color_stone');
                  }}
                  className="px-3 py-1 bg-white border border-red-200 hover:bg-red-50 text-[#b01622] text-xs font-bold rounded flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <i className="fa-solid fa-plus text-[10px]"></i> Add Stone
                </button>
              </div>

              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f8f9fa] text-[10px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200">
                    <th className="px-4 py-2.5">STONE</th>
                    <th className="px-4 py-2.5">RATE / CT (₹)</th>
                    <th className="px-4 py-2.5 text-center">ACTION</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-gray-100">
                  {colorStoneRates.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="py-6 text-center text-gray-400">
                        No color stone rates added.
                      </td>
                    </tr>
                  ) : (
                    colorStoneRates.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/60">
                        <td className="px-4 py-3 text-gray-700 font-normal">{item.stone}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">₹{Number(item.rate_per_ct).toLocaleString('en-IN')}&nbsp;/&nbsp;CT</td>
                        <td className="px-4 py-3 text-center text-gray-400 space-x-2">
                          <button
                            onClick={() => {
                              setEditingItemIndex(idx);
                              setColorStoneForm(item);
                              setActiveModalType('color_stone');
                            }}
                            className="hover:text-[#b01622] cursor-pointer"
                          >
                            <i className="fa-regular fa-pen-to-square"></i>
                          </button>
                          <button onClick={() => handleDeleteColorStone(idx)} className="hover:text-red-600 cursor-pointer">
                            <i className="fa-regular fa-trash-can"></i>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* 4. Additional Charges */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-2xs p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-gray-900">4. Additional Charges</div>
                <button
                  type="button"
                  onClick={() => {
                    setAdditionalForm({
                      minimum_labour: additionalCharges.minimum_labour ?? 1500,
                      single_nose_pin: additionalCharges.single_nose_pin ?? 850,
                      multi_stones: additionalCharges.multi_stones ?? 1000,
                      step_nose_pin: additionalCharges.step_nose_pin ?? 0,
                      tongai: additionalCharges.tongai ?? 0,
                    });
                    setActiveModalType('additional');
                  }}
                  className="text-xs text-[#b01622] font-semibold hover:underline cursor-pointer flex items-center gap-1"
                >
                  <i className="fa-regular fa-pen-to-square"></i> Edit
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[#f8f9fa] p-3 rounded-lg border border-gray-100">
                  <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">MINIMUM LABOUR</div>
                  <div className="text-sm font-bold text-gray-900">₹ {Number(additionalCharges.minimum_labour ?? 1500).toLocaleString('en-IN')}</div>
                  <div className="text-[10px] text-gray-400 mt-1">Per Piece for Below 1.00 gms items</div>
                </div>

                <div className="bg-[#f8f9fa] p-3 rounded-lg border border-gray-100">
                  <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">SINGLE NOSE PIN</div>
                  <div className="text-sm font-bold text-gray-900">₹ {Number(additionalCharges.single_nose_pin ?? 850).toLocaleString('en-IN')}</div>
                  <div className="text-[10px] text-gray-400 mt-1">Per Piece</div>
                </div>

                <div className="bg-[#f8f9fa] p-3 rounded-lg border border-gray-100">
                  <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">MULTI STONES</div>
                  <div className="text-sm font-bold text-gray-900">₹ {Number(additionalCharges.multi_stones ?? 1000).toLocaleString('en-IN')}</div>
                  <div className="text-[10px] text-gray-400 mt-1">Per Piece</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">STEP NOSE PIN</label>
                  <input
                    type="text"
                    value={additionalCharges.step_nose_pin ? `₹ ${Number(additionalCharges.step_nose_pin).toLocaleString('en-IN')}` : '₹ -'}
                    readOnly
                    className="w-full px-3 py-2 bg-[#f8f9fa] border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">TONGAI</label>
                  <input
                    type="text"
                    value={additionalCharges.tongai ? `₹ ${Number(additionalCharges.tongai).toLocaleString('en-IN')}` : '₹ -'}
                    readOnly
                    className="w-full px-3 py-2 bg-[#f8f9fa] border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Right Column Sidebar (Span 1) */}
        <div className="space-y-5">
          
          {/* Current Active Version Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-900">
              <i className="fa-regular fa-bookmark text-[#b01622]"></i>
              <span>Current Active Version</span>
            </div>

            <div className="space-y-3 pt-1 text-xs">
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">CLIENT</div>
                <div className="font-bold text-gray-900">{clientName}</div>
                <div className="text-[11px] font-mono text-gray-400">Code: {clientCode}</div>
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">VERSION</div>
                  <div className="font-bold text-gray-900 text-sm">{version}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">STATUS</div>
                  <span className="bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Active
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-gray-100 pt-3 text-xs">
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">EFFECTIVE FROM</div>
                  <div className="font-semibold text-gray-800">{effectiveFrom || 'Today'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">EFFECTIVE TO</div>
                  <div className="font-semibold text-gray-800">{effectiveTo}</div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3 text-[11px] text-gray-500 flex items-center justify-between">
                <span>LAST UPDATED: <strong className="text-gray-700 font-semibold">{updatedAtStr || 'Just Now'}</strong></span>
              </div>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs space-y-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
              QUICK ACTIONS
            </div>

            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="w-full p-2.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-xs font-bold text-[#b01622] flex items-center gap-2.5 transition-colors cursor-pointer shadow-2xs"
            >
              <i className="fa-solid fa-print text-[#b01622]"></i>
              Print / Export PDF Sheet
            </button>
            <button
              type="button"
              onClick={() => savePriceList()}
              disabled={saving}
              className="w-full p-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800 flex items-center gap-2.5 transition-colors cursor-pointer shadow-2xs"
            >
              <i className="fa-regular fa-floppy-disk text-emerald-700"></i>
              Save Client Price List
            </button>
            <button
              type="button"
              onClick={() => {
                const nextVer = sprintf('%02d', parseInt(version || '01') + 1);
                savePriceList(nextVer);
              }}
              disabled={saving}
              className="w-full p-2.5 bg-white hover:bg-gray-50 border border-red-100 rounded-lg text-xs font-semibold text-[#b01622] flex items-center gap-2.5 transition-colors cursor-pointer shadow-2xs"
            >
              <i className="fa-regular fa-copy text-gray-500"></i>
              Create New Version ({sprintf('%02d', parseInt(version || '01') + 1)})
            </button>
          </div>

        </div>

      </div>

      {/* 5. Section 5: Making Charges */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="text-sm font-bold text-gray-900">5. Making Charges</div>
          <button
            type="button"
            onClick={() => {
              setEditingItemIndex(null);
              setMakingForm({ type_design: '', wastage_percent: '', labour_charge: '', gold_purity: '', on_wt: '' });
              setActiveModalType('making');
            }}
            className="px-3 py-1 bg-white border border-red-200 hover:bg-red-50 text-[#b01622] text-xs font-bold rounded flex items-center gap-1 transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-plus text-[10px]"></i> Add Making Charge
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f8f9fa] text-[10px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200">
                <th className="px-4 py-3">TYPE / DESIGN</th>
                <th className="px-4 py-3">WASTAGE (%)</th>
                <th className="px-4 py-3">LABOUR CHARGE</th>
                <th className="px-4 py-3">GOLD PURITY</th>
                <th className="px-4 py-3">ON WT</th>
                <th className="px-4 py-3 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-gray-100">
              {makingCharges.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-6 text-center text-gray-400">
                    No making charges configured for this client.
                  </td>
                </tr>
              ) : (
                makingCharges.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3.5 text-gray-700 font-normal">{item.type_design}</td>
                    <td className="px-4 py-3.5 font-normal text-gray-700">{item.wastage_percent}</td>
                    <td className="px-4 py-3.5 text-gray-700 font-normal">{item.labour_charge}</td>
                    <td className="px-4 py-3.5 font-mono text-gray-600">{item.gold_purity}</td>
                    <td className="px-4 py-3.5 text-gray-700 font-normal">{item.on_wt}</td>
                    <td className="px-4 py-3.5 text-center text-gray-400 space-x-2">
                      <button
                        onClick={() => {
                          setEditingItemIndex(idx);
                          setMakingForm(item);
                          setActiveModalType('making');
                        }}
                        className="hover:text-[#b01622] cursor-pointer"
                      >
                        <i className="fa-regular fa-pen-to-square"></i>
                      </button>
                      <button onClick={() => handleDeleteMakingCharge(idx)} className="hover:text-red-600 cursor-pointer">
                        <i className="fa-regular fa-trash-can"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Bottom Grid: Inscription (Stamping) & Payment Terms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* 6. Instruction for Inscription on Product (Stamping) */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-gray-900">
              6. Instruction for Inscription on Product (Stamping)
            </div>
            <button
              type="button"
              onClick={() => {
                setStampingForm({ ...stampingInstructions });
                setActiveModalType('stamping');
              }}
              className="text-xs text-[#b01622] font-semibold hover:underline cursor-pointer flex items-center gap-1"
            >
              <i className="fa-regular fa-pen-to-square"></i> Edit
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">STAMPING DETAIL</label>
              <input
                type="text"
                value={stampingInstructions.stamping_detail || '-'}
                readOnly
                className="w-full px-3 py-2 bg-[#f8f9fa] border border-gray-200 rounded-lg font-semibold text-gray-700 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">CERTIFICATION</label>
              <input
                type="text"
                value={stampingInstructions.certification || '-'}
                readOnly
                className="w-full px-3 py-2 bg-[#f8f9fa] border border-gray-200 rounded-lg font-semibold text-gray-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">HALLMARK / HUID</label>
              <input
                type="text"
                value={stampingInstructions.hallmark_huid || 'NO'}
                readOnly
                className="w-full px-3 py-2 bg-[#f8f9fa] border border-gray-200 rounded-lg font-semibold text-gray-700 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">METAL COLOUR</label>
              <input
                type="text"
                value={stampingInstructions.metal_colour || '-'}
                readOnly
                className="w-full px-3 py-2 bg-[#f8f9fa] border border-gray-200 rounded-lg font-semibold text-gray-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">CLIENT QC BEFORE BILLING</label>
              <input
                type="text"
                value={stampingInstructions.client_qc_before_billing || 'NO'}
                readOnly
                className="w-full px-3 py-2 bg-[#f8f9fa] border border-gray-200 rounded-lg font-semibold text-gray-700 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">NECKLACE BACK CHAIN</label>
              <input
                type="text"
                value={stampingInstructions.necklace_back_chain || '-'}
                readOnly
                className="w-full px-3 py-2 bg-[#f8f9fa] border border-gray-200 rounded-lg font-semibold text-gray-500 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* 7. Payment Terms */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
            <div className="text-sm font-bold text-gray-900">7. Payment Terms</div>
            <button
              type="button"
              onClick={() => {
                setEditingItemIndex(null);
                setPaymentTermForm({ type: 'Gold', terms: 'COD' });
                setActiveModalType('payment_term');
              }}
              className="px-3 py-1 bg-white border border-red-200 hover:bg-red-50 text-[#b01622] text-xs font-bold rounded flex items-center gap-1 transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-plus text-[10px]"></i> Add Term
            </button>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f8f9fa] text-[10px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200">
                <th className="px-6 py-3">TYPE</th>
                <th className="px-6 py-3">TERMS</th>
                <th className="px-6 py-3 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-gray-100">
              {paymentTerms.length === 0 ? (
                <tr>
                  <td colSpan="3" className="py-6 text-center text-gray-400">
                    No payment terms added.
                  </td>
                </tr>
              ) : (
                paymentTerms.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/60">
                    <td className="px-6 py-3 text-gray-700 font-normal">{item.type}</td>
                    <td className="px-6 py-3 font-bold text-gray-900">{item.terms}</td>
                    <td className="px-6 py-3 text-center text-gray-400 space-x-2">
                      <button
                        onClick={() => {
                          setEditingItemIndex(idx);
                          setPaymentTermForm(item);
                          setActiveModalType('payment_term');
                        }}
                        className="hover:text-[#b01622] cursor-pointer"
                      >
                        <i className="fa-regular fa-pen-to-square"></i>
                      </button>
                      <button onClick={() => handleDeletePaymentTerm(idx)} className="hover:text-red-600 cursor-pointer">
                        <i className="fa-regular fa-trash-can"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* GLOBAL CONFIRMATION MODAL FOR EDIT & DELETE ACTIONS */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 ${
                confirmDialog.type === 'danger' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'
              }`}>
                <i className={`fa-solid ${confirmDialog.type === 'danger' ? 'fa-triangle-exclamation' : 'fa-circle-question'}`}></i>
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">{confirmDialog.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{confirmDialog.message}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-semibold text-gray-600 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmDialog.onConfirm) confirmDialog.onConfirm();
                  setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                }}
                className={`px-5 py-2 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer ${
                  confirmDialog.type === 'danger'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-[#b01622] hover:bg-[#8e111a]'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALS FOR EDITING/ADDING DATA IN SECTIONS */}
      {activeModalType === 'gold' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">
                {editingItemIndex !== null ? 'Edit Gold Rate Entry' : 'Add Gold Rate Entry'}
              </h3>
              <button type="button" onClick={() => setActiveModalType(null)} className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Select Gold Purity <span className="text-red-500">*</span></label>
                <select
                  value={goldForm.purity}
                  onChange={(e) => {
                    const p = e.target.value;
                    let t = '91.6%';
                    if (p === '24K (999)') t = '99.9%';
                    if (p === '18K (750)') t = '75.0%';
                    if (p === '14K (585)') t = '58.5%';
                    setGoldForm({ ...goldForm, purity: p, touch: t });
                  }}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-900"
                >
                  <option value="22K (916)">22K (916 Hallmark)</option>
                  <option value="24K (999)">24K (999 Fine Gold)</option>
                  <option value="18K (750)">18K (750 Hallmark)</option>
                  <option value="14K (585)">14K (585 Hallmark)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Gold Rate / GM (₹) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={goldForm.gold_rate}
                    onChange={(e) => setGoldForm({ ...goldForm, gold_rate: parseFloat(e.target.value || 0) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-bold text-gray-900"
                    placeholder="13299"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Wastage (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={goldForm.wastage_percent}
                    onChange={(e) => setGoldForm({ ...goldForm, wastage_percent: parseFloat(e.target.value || 0) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-semibold text-gray-900"
                    placeholder="5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Making Charge / GM (₹)</label>
                  <input
                    type="number"
                    value={goldForm.making_charge}
                    onChange={(e) => setGoldForm({ ...goldForm, making_charge: parseFloat(e.target.value || 0) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-semibold text-gray-900"
                    placeholder="650"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Touch %</label>
                  <input
                    type="text"
                    value={goldForm.touch}
                    onChange={(e) => setGoldForm({ ...goldForm, touch: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-amber-900 font-bold"
                    placeholder="91.6%"
                  />
                </div>
              </div>

              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-950 font-semibold flex items-center justify-between">
                <span>Estimated Rate per GM:</span>
                <strong className="text-sm font-bold text-[#b01622]">
                  ₹{Number(Math.round((parseFloat(goldForm.gold_rate || 0) * (1 + (parseFloat(goldForm.wastage_percent || 0) / 100))) + parseFloat(goldForm.making_charge || 0))).toLocaleString('en-IN')}
                </strong>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button type="button" onClick={() => setActiveModalType(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer">Cancel</button>
              <button type="button" onClick={handleSaveGoldRate} className="px-5 py-2 bg-[#b01622] hover:bg-[#8e111a] text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer">Save Gold Rate</button>
            </div>
          </div>
        </div>
      )}

      {activeModalType === 'diamond' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">
                {editingItemIndex !== null ? 'Edit Diamond Stone Rate' : 'Add Diamond Stone Rate'}
              </h3>
              <button type="button" onClick={() => setActiveModalType(null)} className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer"><i className="fa-solid fa-xmark"></i></button>
            </div>
            
            <div className="space-y-4 text-xs">

              {/* Select2 Searchable Dropdown */}
              <div className="relative" ref={select2Ref}>
                <label className="block font-bold text-blue-900 mb-1">
                  Select Product from Master Category: DIAMOND ({masterDiamondProducts.length} Items Available)
                </label>
                
                {/* Select2 Trigger Box */}
                <button
                  type="button"
                  onClick={() => setIsSelect2Open(!isSelect2Open)}
                  className="w-full px-3.5 py-2.5 bg-blue-50/60 border border-blue-300 rounded-xl font-bold text-blue-950 flex items-center justify-between text-xs focus:outline-none focus:ring-2 focus:ring-[#b01622] cursor-pointer shadow-2xs"
                >
                  {diamondForm.shape ? (
                    <span className="flex items-center gap-2 truncate">
                      <i className="fa-solid fa-gem text-blue-600"></i>
                      <span>{diamondForm.shape}</span>
                      {diamondForm.product_code && (
                        <span className="font-mono text-[10px] bg-blue-200/80 text-blue-900 px-1.5 py-0.5 rounded">
                          {diamondForm.product_code}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-gray-400 font-normal">-- Select Diamond Product (Searchable Select2) --</span>
                  )}
                  <i className={`fa-solid fa-chevron-down text-blue-400 text-xs transition-transform ${isSelect2Open ? 'rotate-180' : ''}`}></i>
                </button>

                {/* Select2 Dropdown Popup List with Live Search */}
                {isSelect2Open && (
                  <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-100">
                    
                    {/* Search Input Box */}
                    <div className="p-2 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                      <i className="fa-solid fa-magnifying-glass text-gray-400 text-xs pl-2"></i>
                      <input
                        type="text"
                        autoFocus
                        placeholder="Search diamond product name, SKU..."
                        value={select2SearchTerm}
                        onChange={e => setSelect2SearchTerm(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-[#b01622]"
                      />
                      {select2SearchTerm && (
                        <button
                          type="button"
                          onClick={() => setSelect2SearchTerm('')}
                          className="text-gray-400 hover:text-gray-600 pr-1 cursor-pointer"
                        >
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      )}
                    </div>

                    {/* Options List */}
                    <div className="max-h-56 overflow-y-auto divide-y divide-gray-50">
                      {filteredSelect2Products.length === 0 ? (
                        <div className="py-6 text-center text-gray-400">
                          <i className="fa-solid fa-ghost text-xl mb-1 text-gray-300 block"></i>
                          No matching diamond products found
                        </div>
                      ) : (
                        filteredSelect2Products.map(p => {
                          const isSelected = String(diamondForm.product_id) === String(p.id);
                          return (
                            <div
                              key={p.id}
                              onClick={() => {
                                setDiamondForm({
                                  ...diamondForm,
                                  product_id: p.id,
                                  product_code: p.product_code,
                                  shape: p.name,
                                  rate_per_ct: p.opening_stock_rate || 60000
                                });
                                setIsSelect2Open(false);
                                setSelect2SearchTerm('');
                              }}
                              className={`p-2.5 flex items-center justify-between hover:bg-blue-50 cursor-pointer transition-colors ${
                                isSelected ? 'bg-blue-50/90 font-bold text-blue-900' : 'text-gray-700'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <i className="fa-solid fa-gem text-blue-500 text-xs"></i>
                                <div>
                                  <div className="font-bold text-gray-900">{p.name}</div>
                                  <div className="text-[10px] text-gray-500 font-mono">
                                    SKU: {p.product_code} • Base Rate: ₹{Number(p.opening_stock_rate || 0).toLocaleString('en-IN')}/ct
                                  </div>
                                </div>
                              </div>
                              {isSelected && <i className="fa-solid fa-check text-blue-600 text-xs"></i>}
                            </div>
                          );
                        })
                      )}
                    </div>

                  </div>
                )}
              </div>

              {/* DIAMOND SIZE & SIEVE RANGE SELECTOR (From User Chart) */}
              <div className="bg-gradient-to-br from-amber-50/80 to-amber-100/50 p-4 rounded-xl border border-amber-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <i className="fa-solid fa-ruler-combined text-amber-700"></i>
                    Diamond Size Range Picker (From Reference Chart)
                  </div>
                  <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded">
                    Chart Reference
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 mb-1">From Size (mm)</label>
                    <select
                      value={diamondForm.from_size_index ?? 0}
                      onChange={(e) => handleRangeChartChange(parseInt(e.target.value), diamondForm.to_size_index ?? 5)}
                      className="w-full px-2.5 py-2 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-gray-900"
                    >
                      {DIAMOND_CHART_SIZES.map((item, idx) => (
                        <option key={idx} value={idx}>
                          {item.mm} ({item.sieve}) - {item.weight_ct}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 mb-1">To Size (mm)</label>
                    <select
                      value={diamondForm.to_size_index ?? 5}
                      onChange={(e) => handleRangeChartChange(diamondForm.from_size_index ?? 0, parseInt(e.target.value))}
                      className="w-full px-2.5 py-2 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-gray-900"
                    >
                      {DIAMOND_CHART_SIZES.map((item, idx) => (
                        <option key={idx} value={idx}>
                          {item.mm} ({item.sieve}) - {item.weight_ct}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Auto-Calculated Range Preview Box */}
                <div className="bg-white/90 p-2.5 rounded-lg border border-amber-200 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <div className="text-[10px] font-bold text-amber-800 uppercase">Size (mm) Range</div>
                    <div className="font-bold text-gray-900 mt-0.5">{diamondForm.size_range_mm || '-'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-amber-800 uppercase">Sieve # Range</div>
                    <div className="font-bold text-gray-900 mt-0.5">{diamondForm.sieve || '-'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-amber-800 uppercase">Weight Range</div>
                    <div className="font-mono font-bold text-gray-900 mt-0.5">{diamondForm.stone_cents || '-'}</div>
                  </div>
                </div>
              </div>

              {/* Diamond Form Manual Details */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Diamond Shape / Name</label>
                  <input type="text" value={diamondForm.shape} onChange={e => setDiamondForm({ ...diamondForm, shape: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="Round Diamond" />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Quality</label>
                  <input type="text" value={diamondForm.quality} onChange={e => setDiamondForm({ ...diamondForm, quality: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="EF-VVS" />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Size Range (mm)</label>
                  <input type="text" value={diamondForm.size_range_mm} onChange={e => setDiamondForm({ ...diamondForm, size_range_mm: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="0.80 mm - 1.10 mm" />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Sieve # Range</label>
                  <input type="text" value={diamondForm.sieve} onChange={e => setDiamondForm({ ...diamondForm, sieve: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="+0000 to +0" />
                </div>
              </div>

              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                <label className="block text-xs font-bold text-emerald-950 mb-1">
                  Enter Client Rate / CT (₹) for this Size Range <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={diamondForm.rate_per_ct}
                  onChange={e => setDiamondForm({ ...diamondForm, rate_per_ct: parseFloat(e.target.value || 0) })}
                  className="w-full px-3.5 py-2.5 bg-white border border-emerald-300 rounded-lg text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  placeholder="e.g. 60000"
                />
              </div>

            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button type="button" onClick={() => setActiveModalType(null)} className="px-4 py-2 border rounded-lg text-xs font-semibold text-gray-600">Cancel</button>
              <button type="button" onClick={handleSaveDiamondRate} className="px-5 py-2 bg-[#b01622] text-white text-xs font-bold rounded-lg shadow-sm">Save Stone Rate</button>
            </div>
          </div>
        </div>
      )}

      {activeModalType === 'color_stone' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">{editingItemIndex !== null ? 'Edit Color Stone Rate' : 'Add Color Stone Rate'}</h3>
              <button type="button" onClick={() => setActiveModalType(null)} className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer"><i className="fa-solid fa-xmark"></i></button>
            </div>
            
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Select Stone Name <span className="text-red-500">*</span></label>
                <select
                  value={colorStoneForm.stone || ''}
                  onChange={(e) => setColorStoneForm({ ...colorStoneForm, stone: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                >
                  <option value="">-- Select Stone Name --</option>
                  <option value="Navaratna Stones">Navaratna Stones</option>
                  <option value="Emerald">Emerald</option>
                  <option value="Onyx">Onyx</option>
                  <option value="Ruby (Manikkam)">Ruby (Manikkam)</option>
                  <option value="Blue Sapphire (Neelam)">Blue Sapphire (Neelam)</option>
                  <option value="Yellow Sapphire (Pushparagam)">Yellow Sapphire (Pushparagam)</option>
                  <option value="Pearl (Muthu)">Pearl (Muthu)</option>
                  <option value="Cat's Eye (Vaidooryam)">Cat's Eye (Vaidooryam)</option>
                  <option value="Coral (Pavalam)">Coral (Pavalam)</option>
                  <option value="Garnet">Garnet</option>
                  <option value="CZ / Cubic Zirconia">CZ / Cubic Zirconia</option>
                  <option value="Synthetic Stone">Synthetic Stone</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Rate / CT (₹) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  step="any"
                  value={colorStoneForm.rate_per_ct}
                  onChange={e => setColorStoneForm({ ...colorStoneForm, rate_per_ct: parseFloat(e.target.value || 0) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                  placeholder="e.g. 2000"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setActiveModalType(null)} className="px-4 py-2 border rounded-lg text-xs font-semibold text-gray-600">Cancel</button>
              <button type="button" onClick={handleSaveColorStone} className="px-5 py-2 bg-[#b01622] text-white text-xs font-bold rounded-lg shadow-sm">Save Color Stone</button>
            </div>
          </div>
        </div>
      )}

      {activeModalType === 'additional' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Edit Additional Charges</h3>
              <button type="button" onClick={() => setActiveModalType(null)} className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer"><i className="fa-solid fa-xmark"></i></button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Minimum Labour (₹)</label>
                <input type="number" step="any" value={additionalForm.minimum_labour} onChange={e => setAdditionalForm({ ...additionalForm, minimum_labour: e.target.value })} className="w-full px-3 py-2 border rounded-lg font-bold" />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Single Nose Pin (₹)</label>
                <input type="number" step="any" value={additionalForm.single_nose_pin} onChange={e => setAdditionalForm({ ...additionalForm, single_nose_pin: e.target.value })} className="w-full px-3 py-2 border rounded-lg font-bold" />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Multi Stones (₹)</label>
                <input type="number" step="any" value={additionalForm.multi_stones} onChange={e => setAdditionalForm({ ...additionalForm, multi_stones: e.target.value })} className="w-full px-3 py-2 border rounded-lg font-bold" />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Step Nose Pin (₹)</label>
                <input type="number" step="any" value={additionalForm.step_nose_pin} onChange={e => setAdditionalForm({ ...additionalForm, step_nose_pin: e.target.value })} className="w-full px-3 py-2 border rounded-lg font-bold" placeholder="0" />
              </div>
              <div className="col-span-2">
                <label className="block font-semibold text-gray-700 mb-1">Tongai (₹)</label>
                <input type="number" step="any" value={additionalForm.tongai} onChange={e => setAdditionalForm({ ...additionalForm, tongai: e.target.value })} className="w-full px-3 py-2 border rounded-lg font-bold" placeholder="0" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setActiveModalType(null)} className="px-4 py-2 border rounded-lg text-xs font-semibold text-gray-600">Cancel</button>
              <button type="button" onClick={handleSaveAdditionalCharges} className="px-5 py-2 bg-[#b01622] text-white text-xs font-bold rounded-lg shadow-sm">Save Additional Charges</button>
            </div>
          </div>
        </div>
      )}

      {activeModalType === 'making' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">{editingItemIndex !== null ? 'Edit Making Charge' : 'Add Making Charge'}</h3>
              <button type="button" onClick={() => setActiveModalType(null)} className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer"><i className="fa-solid fa-xmark"></i></button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="col-span-2">
                <label className="block font-semibold text-gray-700 mb-1">Type / Design Settings <span className="text-red-500">*</span></label>
                <select
                  value={makingForm.type_design || ''}
                  onChange={(e) => {
                    const selected = e.target.value;
                    let purity = makingForm.gold_purity;
                    let onWt = makingForm.on_wt;
                    if (selected.startsWith('22KT')) {
                      purity = '916';
                      onWt = '92%';
                    } else if (selected.startsWith('18KT')) {
                      purity = '750';
                      onWt = '76%';
                    }
                    setMakingForm({
                      ...makingForm,
                      type_design: selected,
                      gold_purity: purity,
                      on_wt: onWt
                    });
                  }}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b01622]"
                >
                  <option value="">-- Select 18KT / 22KT Type / Design --</option>
                  <optgroup label="22KT Gold Options">
                    <option value="22KT: Close Setting">22KT: Close Setting</option>
                    <option value="22KT: Open Setting">22KT: Open Setting</option>
                    <option value="22KT: Open / Close">22KT: Open / Close</option>
                  </optgroup>
                  <optgroup label="18KT Gold Options">
                    <option value="18KT: Close Setting">18KT: Close Setting</option>
                    <option value="18KT: Open Setting">18KT: Open Setting</option>
                    <option value="18KT: Open / Close">18KT: Open / Close</option>
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Wastage (%)</label>
                <input type="text" value={makingForm.wastage_percent} onChange={e => setMakingForm({ ...makingForm, wastage_percent: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="6%" />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Labour Charge</label>
                <input type="text" value={makingForm.labour_charge} onChange={e => setMakingForm({ ...makingForm, labour_charge: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="Rs. 500/- per gms wt" />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Gold Purity</label>
                <input type="text" value={makingForm.gold_purity} onChange={e => setMakingForm({ ...makingForm, gold_purity: e.target.value })} className="w-full px-3 py-2 border rounded-lg font-mono" placeholder="916" />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">On Wt (%)</label>
                <input type="text" value={makingForm.on_wt} onChange={e => setMakingForm({ ...makingForm, on_wt: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="92%" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setActiveModalType(null)} className="px-4 py-2 border rounded-lg text-xs font-semibold text-gray-600">Cancel</button>
              <button type="button" onClick={handleSaveMakingCharge} className="px-5 py-2 bg-[#b01622] text-white text-xs font-bold rounded-lg shadow-sm">Save Making Charge</button>
            </div>
          </div>
        </div>
      )}

      {activeModalType === 'stamping' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Edit Stamping Instructions</h3>
              <button type="button" onClick={() => setActiveModalType(null)} className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer"><i className="fa-solid fa-xmark"></i></button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Stamping Detail</label>
                <input type="text" value={stampingForm.stamping_detail} onChange={e => setStampingForm({ ...stampingForm, stamping_detail: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Certification</label>
                <input type="text" value={stampingForm.certification} onChange={e => setStampingForm({ ...stampingForm, certification: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="SGL / IGI" />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Hallmark / HUID</label>
                <input type="text" value={stampingForm.hallmark_huid} onChange={e => setStampingForm({ ...stampingForm, hallmark_huid: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="YES / NO" />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Metal Colour</label>
                <input type="text" value={stampingForm.metal_colour} onChange={e => setStampingForm({ ...stampingForm, metal_colour: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="Yellow Gold" />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Client QC Before Billing</label>
                <input type="text" value={stampingForm.client_qc_before_billing} onChange={e => setStampingForm({ ...stampingForm, client_qc_before_billing: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="YES / NO" />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Necklace Back Chain</label>
                <input type="text" value={stampingForm.necklace_back_chain || ''} onChange={e => setStampingForm({ ...stampingForm, necklace_back_chain: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="Dori / Chain" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setActiveModalType(null)} className="px-4 py-2 border rounded-lg text-xs font-semibold text-gray-600">Cancel</button>
              <button type="button" onClick={handleSaveStamping} className="px-5 py-2 bg-[#b01622] text-white text-xs font-bold rounded-lg shadow-sm">Save Instructions</button>
            </div>
          </div>
        </div>
      )}

      {activeModalType === 'payment_term' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">{editingItemIndex !== null ? 'Edit Payment Term' : 'Add Payment Term'}</h3>
              <button type="button" onClick={() => setActiveModalType(null)} className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer"><i className="fa-solid fa-xmark"></i></button>
            </div>
            
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Type (Gold / Diamond / MC)</label>
                <input type="text" value={paymentTermForm.type} onChange={e => setPaymentTermForm({ ...paymentTermForm, type: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="Gold / Diamond / MC" />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Terms</label>
                <input type="text" value={paymentTermForm.terms} onChange={e => setPaymentTermForm({ ...paymentTermForm, terms: e.target.value })} className="w-full px-3 py-2 border rounded-lg font-bold" placeholder="COD, Net 30" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setActiveModalType(null)} className="px-4 py-2 border rounded-lg text-xs font-semibold text-gray-600">Cancel</button>
              <button type="button" onClick={handleSavePaymentTerm} className="px-5 py-2 bg-[#b01622] text-white text-xs font-bold rounded-lg shadow-sm">Save Payment Term</button>
            </div>
          </div>
        </div>
      )}

      {/* 7. PRINT SHEET MODAL & PDF PREVIEW */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[70] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <style>{`
            @media print {
              body {
                background: white !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              .print\\:hidden, .no-print, header, nav, sidebar, button {
                display: none !important;
              }
              #printable-price-list-sheet {
                position: fixed !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                height: auto !important;
                margin: 0 !important;
                padding: 10mm !important;
                background: white !important;
                border: none !important;
                box-shadow: none !important;
                visibility: visible !important;
                opacity: 1 !important;
                z-index: 999999 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              #printable-price-list-sheet * {
                visibility: visible !important;
                opacity: 1 !important;
              }
              #printable-price-list-sheet th,
              #printable-price-list-sheet td {
                font-feature-settings: "tnum";
              }
              #printable-price-list-sheet .whitespace-nowrap,
              #printable-price-list-sheet td.whitespace-nowrap,
              #printable-price-list-sheet th.whitespace-nowrap {
                white-space: nowrap !important;
                word-break: keep-all !important;
              }
            }
          `}</style>
          <div className="bg-white rounded-2xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-gray-100 space-y-4 max-h-[92vh] flex flex-col">
            
            {/* Modal Header Bar */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 shrink-0 print:hidden">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-file-pdf text-[#b01622] text-lg"></i>
                <h3 className="text-base font-bold text-gray-900">Price List PDF Print Sheet</h3>
                <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-200">A4 Printable Format</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => printElement('printable-price-list-sheet', 'Client Price List')}
                  className="px-4 py-2 bg-[#b01622] hover:bg-[#8e111a] text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
                >
                  <i className="fa-solid fa-print"></i> PRINT / SAVE PDF
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            </div>

            {/* Printable Container (Exact Image Layout) */}
            <div id="printable-price-list-sheet" className="relative overflow-y-auto flex-1 p-5 bg-white rounded-xl border border-gray-200/80 space-y-5 text-xs text-gray-800 font-sans print:p-0 print:border-0 print:overflow-visible">
              
              {/* Background Logo Watermark (Hidden in print) */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04] print:hidden select-none z-0 overflow-hidden">
                <div className="text-center font-black text-[#b01622] transform -rotate-12 space-y-2">
                  <div className="text-[140px] font-black tracking-widest leading-none">RJ</div>
                  <div className="text-4xl uppercase tracking-[0.3em] font-black">RUDRA JEWELLERS</div>
                  <div className="text-2xl uppercase tracking-[0.4em] font-bold text-gray-700">CHENNAI</div>
                </div>
              </div>
              
              {/* Top Header Section */}
              <div className="flex items-start justify-between gap-4 border-b border-gray-200 pb-4">
                {/* Logo Box */}
                <div className="w-40 h-20 bg-[#b01622] rounded-lg text-white flex flex-col items-center justify-center p-2 text-center shrink-0">
                  <div className="font-extrabold tracking-widest text-lg leading-tight flex items-center gap-1">
                    <span className="text-[#ffe0b2]">RJ</span>
                  </div>
                  <div className="text-[9px] uppercase tracking-widest font-semibold mt-0.5 text-red-100">
                    RUDRA JEWELLERS
                  </div>
                  <div className="text-[7px] tracking-wider text-red-200">chennai</div>
                </div>

                {/* Title Box */}
                <div className="text-center flex-1">
                  <h1 className="text-2xl font-black text-[#b01622] tracking-wider uppercase">PRICE LIST</h1>
                  <div className="text-xs font-bold text-gray-600 mt-0.5">Price List - {version}</div>
                  <div className="w-12 h-0.5 bg-[#b01622] mx-auto mt-2 mb-1"></div>
                </div>

                {/* Print Sheet Header Meta */}
                <div className="text-right shrink-0">
                  <div className="text-[10px] font-mono text-gray-500">
                    DATE : {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} | TIME : {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              {/* Info Cards Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Client Details Card */}
                <div className="bg-gray-50/80 p-3.5 rounded-xl border border-gray-200 space-y-1.5 text-xs">
                  <div className="text-[10px] font-bold text-[#b01622] uppercase tracking-wider flex items-center gap-1 mb-2">
                    <i className="fa-regular fa-user"></i> CLIENT DETAILS
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <span className="text-gray-500 font-medium">Client Name</span>
                    <span className="col-span-2 font-bold text-gray-900">: {clientName} ({clientTier})</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <span className="text-gray-500 font-medium">Client Code</span>
                    <span className="col-span-2 font-mono font-bold text-gray-900">: {clientCode}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <span className="text-gray-500 font-medium">Membership Tier</span>
                    <span className="col-span-2 font-bold text-gray-800">: {clientTier} Member</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <span className="text-gray-500 font-medium">Email</span>
                    <span className="col-span-2 font-medium text-gray-800">: {clientEmail}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <span className="text-gray-500 font-medium">Phone</span>
                    <span className="col-span-2 font-medium text-gray-800">: {clientPhone}</span>
                  </div>
                </div>

                {/* Version & Status Card */}
                <div className="bg-gray-50/80 p-3.5 rounded-xl border border-gray-200 space-y-1.5 text-xs">
                  <div className="text-[10px] font-bold text-[#b01622] uppercase tracking-wider flex items-center gap-1 mb-2">
                    <i className="fa-regular fa-calendar-check"></i> VERSION & TIMELINE
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <span className="text-gray-500 font-medium">STARTING FROM</span>
                    <span className="col-span-2 font-bold text-gray-900">: {effectiveFrom || 'Today'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <span className="text-gray-500 font-medium">ENDING TO</span>
                    <span className="col-span-2 font-medium text-gray-800">: {effectiveTo}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <span className="text-gray-500 font-medium">CREATED BY</span>
                    <span className="col-span-2 font-bold text-gray-800">: SUPER ADMIN</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <span className="text-gray-500 font-medium">LAST UPDATED</span>
                    <span className="col-span-2 font-medium text-gray-800">: {updatedAtStr || 'Today'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <span className="text-gray-500 font-medium">STATUS</span>
                    <span className="col-span-2 font-bold text-emerald-700 uppercase">: ACTIVE</span>
                  </div>
                </div>
              </div>

              {/* Main Content Layout Grid */}
              <div className="grid grid-cols-12 gap-4 items-start">
                
                {/* Left Column (8 cols) */}
                <div className="col-span-8 space-y-4">
                  
                  {/* 1. GOLD RATES & CHARGES */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                    <div className="px-3.5 py-2 bg-gray-50 border-b border-gray-200 font-bold text-[#b01622] text-xs flex items-center justify-between">
                      <span>1. GOLD RATES & CHARGES <span className="font-normal text-[10px] text-gray-500">(per gm / purity)</span></span>
                    </div>
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-gray-50/70 text-[9px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200">
                          <th className="px-3 py-2">PURITY / METAL</th>
                          <th className="px-3 py-2">TOUCH %</th>
                          <th className="px-3 py-2 text-center">WASTAGE (%)</th>
                          <th className="px-3 py-2 text-right">ESTIMATED RATE / GM (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium">
                        {goldRates.length === 0 ? (
                          <tr><td colSpan="4" className="px-3 py-4 text-center text-gray-400">No gold rates added</td></tr>
                        ) : (
                          goldRates.map((g, i) => (
                            <tr key={i}>
                              <td className="px-3 py-2 font-bold text-gray-900">{g.purity}</td>
                              <td className="px-3 py-2 text-gray-700">{g.touch || '-'}</td>
                              <td className="px-3 py-2 text-center font-mono text-gray-700">{g.wastage_percent}%</td>
                              <td className="px-3 py-2 text-right font-bold text-[#b01622]">₹{Number(g.effective_rate || (g.gold_rate * (1 + (g.wastage_percent || 0)/100) + (g.making_charge || 0))).toLocaleString('en-IN')}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                    <div className="px-3 py-1.5 text-[9px] text-gray-400 border-t border-gray-100 italic">
                      * Gold rates are recalculated dynamically based on live market rates and wastage standard.
                    </div>
                  </div>

                  {/* 2. DIAMOND RATES */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                    <div className="px-3.5 py-2 bg-gray-50 border-b border-gray-200 font-bold text-[#b01622] text-xs flex items-center justify-between">
                      <span>2. DIAMOND RATES <span className="font-normal text-[10px] text-gray-500">(per carat)</span></span>
                    </div>
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-gray-50/70 text-[9px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200">
                          <th className="px-3 py-2">SHAPE</th>
                          <th className="px-3 py-2">QUALITY</th>
                          <th className="px-3 py-2">SIZE (MM/CT)</th>
                          <th className="px-3 py-2 text-right">RATE / CT (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium">
                        {diamondRates.length === 0 ? (
                          <tr><td colSpan="4" className="px-3 py-4 text-center text-gray-400">No diamond rates added</td></tr>
                        ) : (
                          diamondRates.map((d, i) => (
                            <tr key={i}>
                              <td className="px-3 py-2 font-bold text-gray-900">{d.shape}</td>
                              <td className="px-3 py-2 text-gray-700">{d.quality}</td>
                              <td className="px-3 py-2 text-gray-600">{d.size_range_mm || d.sieve || '-'}</td>
                              <td className="px-3 py-2 text-right font-bold text-gray-900">₹{Number(d.rate_per_ct || 0).toLocaleString('en-IN')}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                    <div className="px-3 py-1.5 text-[9px] text-gray-400 border-t border-gray-100 italic">
                      * Rates are exclusive of GST and other charges.
                    </div>
                  </div>

                  {/* 3 & 4 Column Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* 3. COLOR STONE CHARGES */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                      <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200 font-bold text-[#b01622] text-xs">
                        3. COLOR STONE CHARGES
                      </div>
                      <table className="w-full text-left border-collapse text-[10px]">
                        <thead>
                          <tr className="bg-gray-50/70 text-[9px] font-bold uppercase text-gray-500 border-b border-gray-200">
                            <th className="px-3 py-1.5">TYPE</th>
                            <th className="px-3 py-1.5 text-right whitespace-nowrap w-32">RATE</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-medium">
                          {colorStoneRates.length === 0 ? (
                            <tr><td colSpan="2" className="px-3 py-3 text-center text-gray-400">No stone charges</td></tr>
                          ) : (
                            colorStoneRates.map((c, i) => (
                              <tr key={i}>
                                <td className="px-3 py-1.5 text-gray-800">{c.stone}</td>
                                <td className="px-3 py-1.5 text-right font-bold text-gray-900 whitespace-nowrap">
                                  ₹{Number(c.rate_per_ct || 0).toLocaleString('en-IN')}&nbsp;/&nbsp;CT
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* 4. ADDITIONAL CHARGES */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                      <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200 font-bold text-[#b01622] text-xs">
                        4. ADDITIONAL CHARGES
                      </div>
                      <table className="w-full text-left border-collapse text-[10px]">
                        <thead>
                          <tr className="bg-gray-50/70 text-[9px] font-bold uppercase text-gray-500 border-b border-gray-200">
                            <th className="px-3 py-1.5">CHARGE TYPE</th>
                            <th className="px-3 py-1.5 text-right whitespace-nowrap w-28">RATE (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-medium">
                          <tr>
                            <td className="px-3 py-1.5 text-gray-800">Minimum Labour</td>
                            <td className="px-3 py-1.5 text-right font-bold text-gray-900 whitespace-nowrap">₹{Number(additionalCharges.minimum_labour || 1500).toLocaleString('en-IN')}</td>
                          </tr>
                          <tr>
                            <td className="px-3 py-1.5 text-gray-800">Single Nose Pin</td>
                            <td className="px-3 py-1.5 text-right font-bold text-gray-900 whitespace-nowrap">₹{Number(additionalCharges.single_nose_pin || 850).toLocaleString('en-IN')}</td>
                          </tr>
                          <tr>
                            <td className="px-3 py-1.5 text-gray-800">Multi Stones</td>
                            <td className="px-3 py-1.5 text-right font-bold text-gray-900 whitespace-nowrap">₹{Number(additionalCharges.multi_stones || 1000).toLocaleString('en-IN')}</td>
                          </tr>
                          {additionalCharges.step_nose_pin ? (
                            <tr>
                              <td className="px-3 py-1.5 text-gray-800">Step Nose Pin</td>
                              <td className="px-3 py-1.5 text-right font-bold text-gray-900 whitespace-nowrap">₹{Number(additionalCharges.step_nose_pin).toLocaleString('en-IN')}</td>
                            </tr>
                          ) : null}
                          {additionalCharges.tongai ? (
                            <tr>
                              <td className="px-3 py-1.5 text-gray-800">Tongai</td>
                              <td className="px-3 py-1.5 text-right font-bold text-gray-900 whitespace-nowrap">₹{Number(additionalCharges.tongai).toLocaleString('en-IN')}</td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 5. MAKING CHARGES */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                    <div className="px-3.5 py-2 bg-gray-50 border-b border-gray-200 font-bold text-[#b01622] text-xs">
                      5. MAKING CHARGES
                    </div>
                    <table className="w-full text-left border-collapse text-[10px]">
                      <thead>
                        <tr className="bg-gray-50/70 text-[9px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200">
                          <th className="px-3 py-2">TYPE / DESIGN</th>
                          <th className="px-3 py-2">WASTAGE (%)</th>
                          <th className="px-3 py-2">LABOUR CHARGE</th>
                          <th className="px-3 py-2 font-mono">PURITY</th>
                          <th className="px-3 py-2">ON WT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium">
                        {makingCharges.length === 0 ? (
                          <tr><td colSpan="5" className="px-3 py-4 text-center text-gray-400">No making charges configured</td></tr>
                        ) : (
                          makingCharges.map((m, i) => (
                            <tr key={i}>
                              <td className="px-3 py-2 font-bold text-gray-900">{m.type_design}</td>
                              <td className="px-3 py-2 text-gray-700">{m.wastage_percent}</td>
                              <td className="px-3 py-2 text-gray-800">{m.labour_charge}</td>
                              <td className="px-3 py-2 font-mono text-gray-700">{m.gold_purity}</td>
                              <td className="px-3 py-2 text-gray-700">{m.on_wt}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                    <div className="px-3 py-1.5 text-[9px] text-gray-400 border-t border-gray-100 italic">
                      * Making charges are subject to change without prior notice.
                    </div>
                  </div>

                </div>

                {/* Right Column (4 cols) */}
                <div className="col-span-4 space-y-4">
                  
                  {/* PRICE LIST SUMMARY CARD */}
                  <div className="border-2 border-red-200 rounded-xl p-3.5 bg-red-50/20 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-[#b01622]">
                      <span>PRICE LIST SUMMARY</span>
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold uppercase">ACTIVE</span>
                    </div>
                    <div className="text-base font-black text-gray-900">Price List - {version}</div>
                    <div className="border-t border-red-100 pt-2 text-[10px] space-y-1 text-gray-600">
                      <div className="flex justify-between"><span>Effective From:</span><span className="font-bold text-gray-800">{effectiveFrom || 'Today'}</span></div>
                      <div className="flex justify-between"><span>Last Updated:</span><span className="font-bold text-gray-800">{updatedAtStr || 'Today'}</span></div>
                      <div className="flex justify-between"><span>Updated By:</span><span className="font-bold text-gray-800">Super Admin</span></div>
                    </div>
                  </div>

                  {/* 6. INSTRUCTIONS FOR PRICE SETTING ON PRODUCT */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 font-bold text-[#b01622] text-xs">
                      6. INSTRUCTIONS FOR STAMPING & QC
                    </div>
                    <div className="p-3 text-[10px] space-y-1.5 text-gray-700 font-medium">
                      <div className="flex justify-between border-b border-gray-100 pb-1">
                        <span className="text-gray-500">Stamping Detail</span>
                        <span className="font-bold text-gray-900">{stampingInstructions.stamping_detail || '-'}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 pb-1">
                        <span className="text-gray-500">Certification</span>
                        <span className="font-bold text-gray-900">{stampingInstructions.certification || '-'}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 pb-1">
                        <span className="text-gray-500">Hallmark / HUID</span>
                        <span className="font-bold text-gray-900">{stampingInstructions.hallmark_huid || 'NO'}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 pb-1">
                        <span className="text-gray-500">Metal Colour</span>
                        <span className="font-bold text-gray-900">{stampingInstructions.metal_colour || '-'}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 pb-1">
                        <span className="text-gray-500">Client QC</span>
                        <span className="font-bold text-gray-900">{stampingInstructions.client_qc_before_billing || 'NO'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Necklace Back Chain</span>
                        <span className="font-bold text-gray-900">{stampingInstructions.necklace_back_chain || '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* 7. PAYMENT TERMS */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 font-bold text-[#b01622] text-xs">
                      7. PAYMENT TERMS
                    </div>
                    <table className="w-full text-left border-collapse text-[10px]">
                      <thead>
                        <tr className="bg-gray-50/70 text-[9px] font-bold uppercase text-gray-500 border-b border-gray-200">
                          <th className="px-3 py-1.5">TYPE</th>
                          <th className="px-3 py-1.5 text-right">TERMS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium">
                        {paymentTerms.length === 0 ? (
                          <tr><td colSpan="2" className="px-3 py-3 text-center text-gray-400">No payment terms</td></tr>
                        ) : (
                          paymentTerms.map((p, i) => (
                            <tr key={i}>
                              <td className="px-3 py-1.5 text-gray-800">{p.type}</td>
                              <td className="px-3 py-1.5 text-right font-bold text-gray-900">{p.terms}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                </div>

              </div>

              {/* Footer Stamp & Signature Section (Bottom Alignment) */}
              <div className="border-t-2 border-gray-200 pt-4 flex items-center justify-between gap-4 text-xs mt-auto relative z-10 avoid-break print-break-inside-avoid">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full border-2 border-[#b01622] flex flex-col items-center justify-center text-[8px] font-bold text-[#b01622] p-1 text-center shrink-0">
                    <div>RUDRA</div>
                    <div className="font-extrabold text-[10px]">RJ</div>
                    <div>CHENNAI</div>
                  </div>
                  <div className="text-[10px] text-gray-500 leading-tight">
                    <div>Thank you for your trust and continued partnership.</div>
                    <div className="italic text-gray-400">This is a system generated price list document.</div>
                  </div>
                </div>

                <div className="flex items-center gap-8 text-center shrink-0">
                  <div>
                    <div className="w-28 border-b border-gray-300 mb-1"></div>
                    <span className="text-[10px] font-bold text-gray-700 uppercase block">PREPARED BY</span>
                  </div>
                  <div className="text-right space-y-1 shrink-0">
                    <div className="font-serif italic font-bold text-[#b01622] text-lg leading-none">Rudhra</div>
                    <div className="w-36 h-0.5 bg-gray-300 ml-auto"></div>
                    <div className="text-[10px] font-bold text-gray-800 uppercase tracking-wider">AUTHORIZED SIGNATURE</div>
                    <div className="text-[8px] text-gray-400">Rudra Jewellers, Chennai</div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

// Helper sprintf for version formatting
function sprintf(format, ...args) {
  let i = 0;
  return format.replace(/%0?(\d+)?d/g, (match, p1) => {
    let str = String(args[i++]);
    if (p1) {
      while (str.length < parseInt(p1)) {
        str = '0' + str;
      }
    }
    return str;
  });
}
