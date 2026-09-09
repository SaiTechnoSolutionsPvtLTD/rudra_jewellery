import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../../components/ConfirmModal';
import Pagination from '../../components/Pagination';

export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const { showToast } = useToast();

  // Form modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Delete confirm modal state
  const [deleteTargetRole, setDeleteTargetRole] = useState(null);
  const [deleting, setDeleting] = useState(false);
  
  const [formData, setFormData] = useState({
    role_key: '',
    display_name: '',
    department: '',
    description: ''
  });

  const departments = [
    'Sales',
    'Inventory',
    'Manufacturing',
    'Administration',
    'Finance',
    'Store Management',
    'IT / System'
  ];

  const fetchRoles = async () => {
    try {
      const res = await api.get('/roles');
      setRoles(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      showToast('Failed to load system roles', 'error');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setFormData({
      role_key: '',
      display_name: '',
      department: '',
      description: ''
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (role) => {
    setEditingId(role.id);
    setFormData({
      role_key: role.role_key || '',
      display_name: role.display_name || '',
      department: role.department || '',
      description: role.description || ''
    });
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.role_key.trim()) {
      showToast('Please enter a valid Role Key', 'error', 'Validation Error');
      return;
    }
    if (!formData.display_name.trim()) {
      showToast('Please enter a Display Name', 'error', 'Validation Error');
      return;
    }
    if (!formData.department) {
      showToast('Please select a Department for this role', 'error', 'Validation Error');
      return;
    }

    try {
      if (editingId) {
        await api.put(`/roles/${editingId}`, formData);
        showToast('Role updated successfully!', 'success', 'Updated');
      } else {
        await api.post('/roles', formData);
        showToast('New role created successfully!', 'success', 'Created');
      }
      setShowModal(false);
      fetchRoles();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Error saving role details. Please check inputs.', 'error', 'Operation Failed');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetRole) return;
    setDeleting(true);
    try {
      await api.delete(`/roles/${deleteTargetRole.id}`);
      showToast(`Role "${deleteTargetRole.display_name}" deleted successfully`, 'success', 'Deleted');
      setDeleteTargetRole(null);
      fetchRoles();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete role', 'error', 'Error');
    } finally {
      setDeleting(false);
    }
  };

  const filteredRoles = roles.filter(role => {
    const matchesSearch = (role.display_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (role.role_key || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = deptFilter === 'all' || role.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  const totalPages = Math.ceil(filteredRoles.length / itemsPerPage) || 1;
  const paginatedRoles = filteredRoles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="w-full pb-12">
      
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
            AUTHENTICATION <span className="text-gray-300 mx-1">▸</span> <span className="text-gray-500">ROLE MANAGEMENT</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Role Management</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCreateModal}
            className="px-5 py-2.5 bg-[#b01622] hover:bg-[#90121b] text-white text-sm font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-colors"
          >
            <i className="fa-solid fa-plus text-xs"></i>
            Create New Role
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-[#b01622] flex items-center justify-center text-lg shrink-0">
            <i className="fa-solid fa-[#b01622] fa-user-shield"></i>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 mb-1">Total System Roles</p>
            <div className="text-2xl font-bold text-gray-900 tracking-tight">{roles.length}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center text-lg shrink-0">
            <i className="fa-solid fa-building-user"></i>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 mb-1">Departments Covered</p>
            <div className="text-2xl font-bold text-gray-900 tracking-tight">
              {new Set(roles.map(r => r.department)).size}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg shrink-0">
            <i className="fa-solid fa-users"></i>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 mb-1">Active Staff Users</p>
            <div className="text-2xl font-bold text-gray-900 tracking-tight">42</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <i className="fa-solid fa-magnifying-glass text-xs"></i>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by role key or name..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-[#b01622] focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3.5 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:border-[#b01622]"
            >
              <option value="all">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
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
                <th className="px-6 py-4">DISPLAY NAME</th>
                <th className="px-6 py-4">ROLE KEY</th>
                <th className="px-6 py-4">DEPARTMENT</th>
                <th className="px-6 py-4">DESCRIPTION</th>
                <th className="px-6 py-4 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-400">
                    <i className="fa-solid fa-circle-notch fa-spin mr-2"></i> Loading roles...
                  </td>
                </tr>
              ) : paginatedRoles.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-400">
                    No roles found matching criteria.
                  </td>
                </tr>
              ) : (
                paginatedRoles.map(role => (
                  <tr key={role.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{role.display_name}</td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">
                        {role.role_key}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-block bg-red-50 text-[#b01622] text-xs font-semibold px-2.5 py-1 rounded-md">
                        {role.department}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600 max-w-md truncate">
                      {role.description || '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-3 text-gray-400">
                        <button
                          onClick={() => handleOpenEditModal(role)}
                          className="p-1 hover:text-[#b01622] transition-colors"
                          title="Edit Role"
                        >
                          <i className="fa-regular fa-pen-to-square text-sm"></i>
                        </button>
                        <button
                          onClick={() => setDeleteTargetRole(role)}
                          className="p-1 hover:text-red-600 transition-colors"
                          title="Delete Role"
                        >
                          <i className="fa-regular fa-trash-can text-sm"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredRoles.length}
          itemsPerPage={itemsPerPage}
          onPageChange={(page) => setCurrentPage(page)}
          onItemsPerPageChange={(num) => {
            setItemsPerPage(num);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* CREATE / EDIT ROLE MODAL (Matching attached image) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
              <h3 className="text-lg font-bold text-gray-900">
                {editingId ? 'Edit Role Details' : 'Role Details'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Role Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Role Key */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Role Key
                </label>
                <input
                  type="text"
                  name="role_key"
                  value={formData.role_key}
                  onChange={handleChange}
                  placeholder="example: sales_manager"
                  required
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors"
                />
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  name="display_name"
                  value={formData.display_name}
                  onChange={handleChange}
                  placeholder="Sales Manager"
                  required
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors"
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Department
                </label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-white border border-gray-900 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors"
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  rows="3"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Short description for this role"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors resize-none"
                ></textarea>
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#b01622] hover:bg-[#90121b] text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
                >
                  {editingId ? 'Update Role' : 'Save Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={!!deleteTargetRole}
        title="Delete System Role?"
        message={
          deleteTargetRole
            ? `Are you sure you want to delete the "${deleteTargetRole.display_name}" (${deleteTargetRole.role_key}) role? Users assigned to this role may lose their permissions.`
            : ''
        }
        confirmText="Confirm Delete"
        cancelText="Cancel"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetRole(null)}
      />

    </div>
  );
}
