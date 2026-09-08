import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../../components/ConfirmModal';
import Pagination from '../../components/Pagination';

export default function ClientList() {
  const [data, setData] = useState({ stats: {}, clients: [] });
  const [membershipPlans, setMembershipPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const { showToast } = useToast();

  // Delete Confirm Modal State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const [clientRes, memRes] = await Promise.all([
        api.get('/clients', { params: { search: searchTerm, status: statusFilter } }),
        api.get('/memberships')
      ]);
      setData(clientRes.data);
      setMembershipPlans(memRes.data);
    } catch (err) {
      console.error(err);
      showToast('Failed to load client records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [searchTerm, statusFilter]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/clients/${deleteTarget.id}`);
      showToast(`Client "${deleteTarget.full_name || deleteTarget.name}" deleted successfully`, 'success', 'Deleted');
      setDeleteTarget(null);
      fetchClients();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete client', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const stats = data?.stats || {};
  const clients = data?.clients || [];
  const totalPages = Math.ceil(clients.length / itemsPerPage) || 1;
  const paginatedClients = clients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const renderTierBadge = (tier) => {
    const matchedPlan = membershipPlans.find(
      p => String(p.code).toLowerCase() === String(tier).toLowerCase() ||
           String(p.name).toLowerCase() === String(tier).toLowerCase()
    );

    if (matchedPlan) {
      return (
        <span className="inline-flex items-center gap-1.5 bg-red-50 text-[#b01622] text-xs font-bold px-2.5 py-0.5 rounded-full border border-red-100">
          <i className="fa-solid fa-[#b01622] fa-crown text-[10px]"></i>
          {matchedPlan.name}
        </span>
      );
    }

    const t = (tier || 'silver').toLowerCase();
    switch (t) {
      case 'elite':
      case 'platinum elite':
        return <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-purple-200">PLATINUM ELITE</span>;
      case 'platinum':
        return <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-slate-300">PLATINUM</span>;
      case 'gold':
        return <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-200">GOLD TIER</span>;
      default:
        return <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-gray-200">{String(tier).toUpperCase()}</span>;
    }
  };

  return (
    <div className="w-full pb-12">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
            CUSTOMERS <span className="text-gray-300 mx-1">▸</span> <span className="text-gray-500">CLIENT DIRECTORY</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Client Directory ({clients.length} Registered)</h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/clients/create"
            className="px-5 py-2.5 bg-[#b01622] hover:bg-[#90121b] text-white text-sm font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-user-plus text-xs"></i>
            Register New Client
          </Link>
        </div>
      </div>

      {/* 3 Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-[#b01622] flex items-center justify-center text-lg shrink-0">
            <i className="fa-solid fa-users"></i>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 mb-1">Total Registered Clients</p>
            <div className="text-2xl font-bold text-gray-900 tracking-tight">
              {stats.todayClients ? stats.todayClients.toLocaleString() : clients.length}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center text-lg shrink-0">
            <i className="fa-regular fa-star"></i>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 mb-1">Active Membership Clients</p>
            <div className="text-2xl font-bold text-gray-900 tracking-tight">
              {stats.activeMembers ? stats.activeMembers.toLocaleString() : clients.filter(c => c.status === 'active').length}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg shrink-0">
            <i className="fa-solid fa-user-check"></i>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 mb-1">Recent Registrations (30d)</p>
            <div className="text-2xl font-bold text-gray-900 tracking-tight">
              {stats.newReg || clients.length}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4 mb-6">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="relative w-full lg:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <i className="fa-solid fa-magnifying-glass text-xs"></i>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search name, phone, client code..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-[#b01622] focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3.5 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:border-[#b01622]"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Clients Only</option>
              <option value="inactive">Inactive Clients Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f6eee9] border-b border-gray-200/60 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                <th className="px-6 py-4">CLIENT NAME</th>
                <th className="px-6 py-4">CLIENT CODE</th>
                <th className="px-6 py-4">PHONE & EMAIL</th>
                <th className="px-6 py-4">MEMBERSHIP PLAN</th>
                <th className="px-6 py-4">TOTAL PURCHASES</th>
                <th className="px-6 py-4">STATUS</th>
                <th className="px-6 py-4 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-400">
                    <i className="fa-solid fa-circle-notch fa-spin mr-2"></i> Loading client directory...
                  </td>
                </tr>
              ) : paginatedClients.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-400">
                    No clients found matching search criteria.
                  </td>
                </tr>
              ) : (
                paginatedClients.map(item => {
                  const clientName = item.full_name || item.name || 'Client';
                  const clientCode = item.client_code || item.code || 'RJ-CL-1001';
                  const clientPhone = item.primary_phone || item.phone || '-';
                  const clientEmail = item.email || '-';

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-900 flex items-center gap-3">
                        {item.avatar_url || item.avatar ? (
                          <img
                            src={item.avatar_url || item.avatar}
                            alt={clientName}
                            className="w-10 h-10 rounded-full object-cover border border-gray-200 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-red-50 text-[#b01622] flex items-center justify-center text-xs font-bold shrink-0">
                            {clientName.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div>{clientName}</div>
                          {item.city && <div className="text-xs font-normal text-gray-400">{item.city}, {item.state}</div>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-semibold bg-gray-100 px-2.5 py-1 rounded text-gray-800 border border-gray-200">
                          {clientCode}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-semibold text-gray-800">{clientPhone}</div>
                        <div className="text-[11px] text-gray-400">{clientEmail}</div>
                      </td>
                      <td className="px-6 py-4">
                        {renderTierBadge(item.membership_tier || item.tier)}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs font-semibold text-gray-900">
                        ₹{Number(item.total_purchases || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4">
                        {item.status === 'active' || item.status === 'Active' ? (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-md border border-emerald-200/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-600 text-xs font-semibold px-2.5 py-1 rounded-md border border-gray-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-3 text-gray-400">
                          <Link
                            to={`/clients/${item.id}/price-list`}
                            className="p-1 hover:text-[#b01622] transition-colors cursor-pointer text-gray-500"
                            title="View Client Price List"
                          >
                            <i className="fa-solid fa-receipt text-sm"></i>
                          </Link>
                          <Link
                            to={`/clients/${item.id}/edit`}
                            className="p-1 hover:text-[#b01622] transition-colors cursor-pointer"
                            title="Edit Client Profile"
                          >
                            <i className="fa-regular fa-pen-to-square text-sm"></i>
                          </Link>
                          <button
                            onClick={() => setDeleteTarget(item)}
                            className="p-1 hover:text-red-600 transition-colors cursor-pointer"
                            title="Delete Client Profile"
                          >
                            <i className="fa-regular fa-trash-can text-sm"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={clients.length}
          itemsPerPage={itemsPerPage}
          onPageChange={(page) => setCurrentPage(page)}
          onItemsPerPageChange={(num) => {
            setItemsPerPage(num);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Client Record?"
        message={
          deleteTarget
            ? `Are you sure you want to delete client record for "${deleteTarget.full_name || deleteTarget.name}" (${deleteTarget.client_code || deleteTarget.code})? This action cannot be undone.`
            : ''
        }
        confirmText="Confirm Delete"
        cancelText="Cancel"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

    </div>
  );
}
