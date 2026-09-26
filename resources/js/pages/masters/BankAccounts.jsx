import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { handleIntegerKeyDown, sanitizeInteger } from '../../utils/numberInputUtils';

const DEFAULT_BANK_ACCOUNTS = [
  {
    id: 1,
    bank_name: 'HDFC Bank',
    account_name: 'Rudra Jewellers Pvt Ltd',
    account_number: '50200018899221',
    ifsc_code: 'HDFC0000124',
    branch: 'Sowcarpet, Chennai',
    account_type: 'Current Account',
    upi_id: 'rudrajewellers@hdfcbank',
    is_default: true,
    is_active: true
  },
  {
    id: 2,
    bank_name: 'State Bank of India',
    account_name: 'Rudra Jewellers Pvt Ltd',
    account_number: '39488210045',
    ifsc_code: 'SBIN0000800',
    branch: 'NSC Bose Road, Chennai',
    account_type: 'Current Account',
    upi_id: 'rudra.sbi@upi',
    is_default: false,
    is_active: true
  }
];

export const getStoredDefaultBankAccount = () => {
  try {
    const raw = localStorage.getItem('rudhra_bank_accounts');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.find(a => a.is_default) || parsed[0];
      }
    }
  } catch (e) {}
  return DEFAULT_BANK_ACCOUNTS[0];
};

export default function BankAccounts() {
  const { showToast } = useToast();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    bank_name: '',
    account_name: 'Rudra Jewellers Pvt Ltd',
    account_number: '',
    ifsc_code: '',
    branch: 'Sowcarpet, Chennai',
    account_type: 'Current Account',
    upi_id: '',
    is_default: false,
    is_active: true
  });

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/bank-accounts');
      const data = response?.data;
      if (Array.isArray(data) && data.length > 0) {
        setAccounts(data);
        localStorage.setItem('rudhra_bank_accounts', JSON.stringify(data));
      } else {
        setAccounts(DEFAULT_BANK_ACCOUNTS);
        localStorage.setItem('rudhra_bank_accounts', JSON.stringify(DEFAULT_BANK_ACCOUNTS));
      }
    } catch (err) {
      console.warn('Bank accounts fetch warning, fallback to default:', err);
      const stored = localStorage.getItem('rudhra_bank_accounts');
      if (stored) {
        try { setAccounts(JSON.parse(stored)); } catch (e) { setAccounts(DEFAULT_BANK_ACCOUNTS); }
      } else {
        setAccounts(DEFAULT_BANK_ACCOUNTS);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleOpenAddModal = () => {
    setFormData({
      bank_name: '',
      account_name: 'Rudra Jewellers Pvt Ltd',
      account_number: '',
      ifsc_code: '',
      branch: 'Sowcarpet, Chennai',
      account_type: 'Current Account',
      upi_id: '',
      is_default: accounts.length === 0,
      is_active: true
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (acc) => {
    setSelectedAccount(acc);
    setFormData({
      bank_name: acc.bank_name || '',
      account_name: acc.account_name || 'Rudra Jewellers Pvt Ltd',
      account_number: acc.account_number || '',
      ifsc_code: acc.ifsc_code || '',
      branch: acc.branch || '',
      account_type: acc.account_type || 'Current Account',
      upi_id: acc.upi_id || '',
      is_default: !!acc.is_default,
      is_active: !!acc.is_active
    });
    setIsEditModalOpen(true);
  };

  const handleOpenDeleteModal = (acc) => {
    setSelectedAccount(acc);
    setIsDeleteModalOpen(true);
  };

  const handleSaveAdd = async (e) => {
    e.preventDefault();
    if (!formData.bank_name || !formData.account_number || !formData.ifsc_code) {
      showToast?.('Please fill required fields (Bank Name, Account Number, IFSC)', 'error');
      return;
    }

    try {
      const response = await api.post('/bank-accounts', formData);
      showToast?.('Bank account added successfully!', 'success');
      setIsAddModalOpen(false);
      fetchAccounts();
    } catch (err) {
      // Local fallback sync
      const newAcc = {
        id: Date.now(),
        ...formData
      };
      let updated = [...accounts];
      if (newAcc.is_default) {
        updated = updated.map(a => ({ ...a, is_default: false }));
      }
      updated.unshift(newAcc);
      setAccounts(updated);
      localStorage.setItem('rudhra_bank_accounts', JSON.stringify(updated));
      showToast?.('Bank account added!', 'success');
      setIsAddModalOpen(false);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!selectedAccount) return;

    try {
      await api.put(`/bank-accounts/${selectedAccount.id}`, formData);
      showToast?.('Bank account updated successfully!', 'success');
      setIsEditModalOpen(false);
      fetchAccounts();
    } catch (err) {
      // Local fallback sync
      let updated = accounts.map(a => {
        if (a.id === selectedAccount.id) {
          return { ...a, ...formData };
        }
        return formData.is_default ? { ...a, is_default: false } : a;
      });
      setAccounts(updated);
      localStorage.setItem('rudhra_bank_accounts', JSON.stringify(updated));
      showToast?.('Bank account updated!', 'success');
      setIsEditModalOpen(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAccount) return;

    try {
      await api.delete(`/bank-accounts/${selectedAccount.id}`);
      showToast?.('Bank account deleted successfully!', 'success');
      setIsDeleteModalOpen(false);
      fetchAccounts();
    } catch (err) {
      const updated = accounts.filter(a => a.id !== selectedAccount.id);
      if (selectedAccount.is_default && updated.length > 0) {
        updated[0].is_default = true;
      }
      setAccounts(updated);
      localStorage.setItem('rudhra_bank_accounts', JSON.stringify(updated));
      showToast?.('Bank account deleted!', 'success');
      setIsDeleteModalOpen(false);
    }
  };

  const handleSetDefault = async (acc) => {
    try {
      await api.post(`/bank-accounts/${acc.id}/set-default`);
      showToast?.(`${acc.bank_name} set as default bank for bills & invoices!`, 'success');
      fetchAccounts();
    } catch (err) {
      const updated = accounts.map(a => ({
        ...a,
        is_default: a.id === acc.id
      }));
      setAccounts(updated);
      localStorage.setItem('rudhra_bank_accounts', JSON.stringify(updated));
      showToast?.(`${acc.bank_name} set as default bank for bills & invoices!`, 'success');
    }
  };

  const filteredAccounts = accounts.filter(acc => 
    (acc.bank_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (acc.account_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (acc.ifsc_code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (acc.branch || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full min-h-screen pb-16 space-y-6 font-['Inter',-apple-system,BlinkMacSystemFont,sans-serif] text-gray-800">
      
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-stone-400 font-semibold mb-1">
            <Link to="/dashboard" className="hover:text-stone-900">Dashboard</Link>
            <span>&gt;</span>
            <span className="text-stone-600">Masters</span>
            <span>&gt;</span>
            <span className="text-[#b01622]">Bank Accounts</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <span>Bank Accounts Master</span>
            <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-[#b01622] text-xs font-extrabold border border-red-200">
              {accounts.length} Accounts
            </span>
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Manage showroom company bank details printed dynamically on Tax Invoices, Receipts &amp; Remittance slips
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 bg-[#b01622] hover:bg-[#8e111a] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer shrink-0"
        >
          <i className="fa-solid fa-plus text-xs"></i>
          <span>Add Bank Account</span>
        </button>
      </div>

      {/* Main Content Card */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-2xs space-y-4">
        
        {/* Search & Actions Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-stone-100">
          <div className="relative w-full sm:w-80">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs"></i>
            <input
              type="text"
              placeholder="Search by Bank Name, Account No, IFSC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#b01622] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
              >
                <i className="fa-solid fa-circle-xmark"></i>
              </button>
            )}
          </div>

          <div className="text-xs text-stone-500 font-medium self-end sm:self-center">
            Showing <strong className="text-stone-900">{filteredAccounts.length}</strong> of {accounts.length} entries
          </div>
        </div>

        {/* Table View */}
        {loading ? (
          <div className="py-12 text-center text-stone-400 text-xs font-medium flex items-center justify-center gap-2">
            <i className="fa-solid fa-circle-notch fa-spin text-[#b01622] text-lg"></i>
            <span>Loading bank accounts...</span>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="py-12 text-center text-stone-400 text-xs space-y-2">
            <i className="fa-solid fa-[#b01622] fa-building-columns text-3xl opacity-30 text-[#b01622]"></i>
            <p className="font-semibold text-stone-600">No bank accounts found</p>
            <p className="text-stone-400">Click "Add Bank Account" to create your first company bank account.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-stone-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider">
                  <th className="px-4 py-3">Bank &amp; Branch</th>
                  <th className="px-4 py-3">Account Name</th>
                  <th className="px-4 py-3">Account No. &amp; Type</th>
                  <th className="px-4 py-3">IFSC &amp; UPI</th>
                  <th className="px-4 py-3 text-center">Print Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-amber-50/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-red-50 text-[#b01622] flex items-center justify-center font-bold text-sm shrink-0 border border-red-100">
                          <i className="fa-solid fa-building-columns"></i>
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 flex items-center gap-1.5">
                            <span>{acc.bank_name}</span>
                            {acc.is_default && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-300">
                                DEFAULT PRINT BANK
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-stone-500 font-medium mt-0.5">
                            {acc.branch || 'Main Branch'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 font-semibold text-stone-800">
                      {acc.account_name}
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-stone-900 tracking-wider">
                        {acc.account_number}
                      </div>
                      <div className="text-[11px] text-stone-500 font-medium">
                        {acc.account_type || 'Current Account'}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-mono font-semibold text-stone-800">
                        {acc.ifsc_code}
                      </div>
                      {acc.upi_id && (
                        <div className="text-[11px] text-[#b01622] font-mono font-medium mt-0.5">
                          UPI: {acc.upi_id}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleSetDefault(acc)}
                        title={acc.is_default ? 'Default bank for invoices' : 'Click to set as default bank for invoices'}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          acc.is_default
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-stone-100 text-stone-600 border border-stone-200 hover:bg-red-50 hover:text-[#b01622] hover:border-red-200'
                        }`}
                      >
                        {acc.is_default ? '✓ Active Default' : 'Set As Default'}
                      </button>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(acc)}
                          className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
                          title="Edit Bank Account"
                        >
                          <i className="fa-solid fa-pen text-xs"></i>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDeleteModal(acc)}
                          className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-colors cursor-pointer"
                          title="Delete Bank Account"
                        >
                          <i className="fa-solid fa-trash-can text-xs"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD BANK ACCOUNT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-[#b01622] flex items-center justify-center font-bold">
                  <i className="fa-solid fa-building-columns"></i>
                </div>
                <h3 className="font-bold text-stone-900 text-sm">Add New Company Bank Account</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-base cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-stone-600 font-bold mb-1">
                  Bank Name <span className="text-[#b01622]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC Bank, State Bank of India"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-hidden focus:border-[#b01622]"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-bold mb-1">
                  Account Name (Beneficiary) <span className="text-[#b01622]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rudra Jewellers Pvt Ltd"
                  value={formData.account_name}
                  onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-hidden focus:border-[#b01622]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-600 font-bold mb-1">
                    Account Number <span className="text-[#b01622]">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    placeholder="e.g. 50200018899221"
                    value={formData.account_number}
                    onKeyDown={handleIntegerKeyDown}
                    onChange={(e) => setFormData({ ...formData, account_number: sanitizeInteger(e.target.value) })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl font-mono focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 font-bold mb-1">
                    IFSC Code <span className="text-[#b01622]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HDFC0000124"
                    value={formData.ifsc_code}
                    onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl font-mono focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-600 font-bold mb-1">Branch Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Sowcarpet, Chennai"
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 font-bold mb-1">Account Type</label>
                  <select
                    value={formData.account_type}
                    onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-hidden focus:border-[#b01622]"
                  >
                    <option value="Current Account">Current Account</option>
                    <option value="Savings Account">Savings Account</option>
                    <option value="Cash Credit">Cash Credit</option>
                    <option value="Overdraft">Overdraft</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-stone-600 font-bold mb-1">UPI ID (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. rudrajewellers@hdfcbank"
                  value={formData.upi_id}
                  onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl font-mono focus:outline-hidden focus:border-[#b01622]"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="add_is_default"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  className="rounded border-stone-300 text-[#b01622] focus:ring-[#b01622] cursor-pointer"
                />
                <label htmlFor="add_is_default" className="font-bold text-stone-800 cursor-pointer">
                  Set as Default Bank Account for Tax Invoices &amp; Bills
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 hover:bg-stone-100 text-stone-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#b01622] hover:bg-[#8e111a] text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Save Bank Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BANK ACCOUNT MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-[#b01622] flex items-center justify-center font-bold">
                  <i className="fa-solid fa-pen"></i>
                </div>
                <h3 className="font-bold text-stone-900 text-sm">Edit Bank Account</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-base cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-stone-600 font-bold mb-1">
                  Bank Name <span className="text-[#b01622]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-hidden focus:border-[#b01622]"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-bold mb-1">
                  Account Name <span className="text-[#b01622]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.account_name}
                  onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-hidden focus:border-[#b01622]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-600 font-bold mb-1">
                    Account Number <span className="text-[#b01622]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.account_number}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl font-mono focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 font-bold mb-1">
                    IFSC Code <span className="text-[#b01622]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.ifsc_code}
                    onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl font-mono focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-600 font-bold mb-1">Branch Location</label>
                  <input
                    type="text"
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-hidden focus:border-[#b01622]"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 font-bold mb-1">Account Type</label>
                  <select
                    value={formData.account_type}
                    onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-hidden focus:border-[#b01622]"
                  >
                    <option value="Current Account">Current Account</option>
                    <option value="Savings Account">Savings Account</option>
                    <option value="Cash Credit">Cash Credit</option>
                    <option value="Overdraft">Overdraft</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-stone-600 font-bold mb-1">UPI ID (Optional)</label>
                <input
                  type="text"
                  value={formData.upi_id}
                  onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl font-mono focus:outline-hidden focus:border-[#b01622]"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit_is_default"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  className="rounded border-stone-300 text-[#b01622] focus:ring-[#b01622] cursor-pointer"
                />
                <label htmlFor="edit_is_default" className="font-bold text-stone-800 cursor-pointer">
                  Set as Default Bank Account for Tax Invoices &amp; Bills
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 hover:bg-stone-100 text-stone-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#b01622] hover:bg-[#8e111a] text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Update Bank Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && selectedAccount && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-stone-200 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto text-xl font-bold">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">Delete Bank Account?</h3>
              <p className="text-xs text-stone-500 mt-1">
                Are you sure you want to delete <strong className="text-stone-800">{selectedAccount.bank_name}</strong> ({selectedAccount.account_number})?
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
