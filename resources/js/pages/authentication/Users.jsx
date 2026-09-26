import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../../components/ConfirmModal';
import Pagination from '../../components/Pagination';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [rolesList, setRolesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const { showToast } = useToast();

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // Delete Confirm Modal State
  const [deleteTargetUser, setDeleteTargetUser] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile_number: '',
    role: 'Staff',
    status: 'active',
    password: '',
    confirm_password: ''
  });

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      showToast('Failed to load users list', 'error');
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await api.get('/roles');
      if (Array.isArray(res.data) && res.data.length > 0) {
        setRolesList(res.data.map(r => r.display_name));
      } else {
        setRolesList(['Super Admin', 'Admin', 'Manager', 'Staff', 'Karigar']);
      }
    } catch (err) {
      setRolesList(['Super Admin', 'Admin', 'Manager', 'Staff', 'Karigar']);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setFormData({
      name: '',
      email: '',
      mobile_number: '',
      role: rolesList[0] || 'Staff',
      status: 'active',
      password: '',
      confirm_password: ''
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (user) => {
    setEditingId(user.id);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      mobile_number: user.mobile_number || '',
      role: user.role || 'Staff',
      status: user.status || 'active',
      password: '',
      confirm_password: ''
    });
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Form Validations
    if (!formData.name.trim()) {
      showToast('Please enter User Name', 'error', 'Validation Error');
      return;
    }
    if (!formData.email.trim()) {
      showToast('Please enter User Email', 'error', 'Validation Error');
      return;
    }
    if (!editingId) {
      if (!formData.password) {
        showToast('Please enter a Password for the user', 'error', 'Validation Error');
        return;
      }
      if (formData.password.length < 6) {
        showToast('Password must be at least 6 characters long', 'error', 'Validation Error');
        return;
      }
      if (formData.password !== formData.confirm_password) {
        showToast('Password and Confirm Password do not match!', 'error', 'Password Mismatch');
        return;
      }
    } else {
      if (formData.password && formData.password !== formData.confirm_password) {
        showToast('Password and Confirm Password do not match!', 'error', 'Password Mismatch');
        return;
      }
    }

    try {
      if (editingId) {
        await api.put(`/users/${editingId}`, formData);
        showToast(`User "${formData.name}" updated successfully!`, 'success', 'Updated');
      } else {
        await api.post('/users', formData);
        showToast(`New user "${formData.name}" created successfully!`, 'success', 'Created');
      }
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to save user details', 'error', 'Operation Failed');
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!deleteTargetUser) return;
    setDeleting(true);
    try {
      await api.delete(`/users/${deleteTargetUser.id}`);
      showToast(`User "${deleteTargetUser.name}" deleted successfully`, 'success', 'Deleted');
      setDeleteTargetUser(null);
      fetchUsers();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete user', 'error', 'Error');
    } finally {
      setDeleting(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (u.mobile_number || '').includes(searchTerm);
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="w-full pb-12">
      
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
            AUTHENTICATION <span className="text-gray-300 mx-1">▸</span> <span className="text-gray-500">USER MANAGEMENT</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCreateModal}
            className="px-5 py-2.5 bg-[#b01622] hover:bg-[#90121b] text-white text-sm font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-colors"
          >
            <i className="fa-solid fa-user-plus text-xs"></i>
            Add New User
          </button>
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-[#b01622] flex items-center justify-center text-lg shrink-0">
            <i className="fa-solid fa-users"></i>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 mb-1">Total System Users</p>
            <div className="text-2xl font-bold text-gray-900 tracking-tight">{users.length}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg shrink-0">
            <i className="fa-solid fa-user-check"></i>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 mb-1">Active Staff Members</p>
            <div className="text-2xl font-bold text-gray-900 tracking-tight">
              {users.filter(u => !u.status || String(u.status).toLowerCase() === 'active').length}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center text-lg shrink-0">
            <i className="fa-solid fa-user-shield"></i>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 mb-1">Assigned Roles</p>
            <div className="text-2xl font-bold text-gray-900 tracking-tight">
              {new Set(users.map(u => u.role)).size}
            </div>
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
              placeholder="Search by name, email, or mobile..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-[#b01622] focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3.5 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:border-[#b01622]"
            >
              <option value="all">All Roles</option>
              {rolesList.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f6eee9] border-b border-gray-200/60 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                <th className="px-6 py-4">USER DETAILS</th>
                <th className="px-6 py-4">EMAIL ADDRESS</th>
                <th className="px-6 py-4">MOBILE NUMBER</th>
                <th className="px-6 py-4">ASSIGNED ROLE</th>
                <th className="px-6 py-4 text-center">STATUS</th>
                <th className="px-6 py-4 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                    <i className="fa-solid fa-circle-notch fa-spin mr-2"></i> Loading user accounts...
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                    No user accounts found.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map(user => {
                  const initials = (user.name || 'U').split(' ').map(n => n[0]).join('');
                  return (
                    <tr key={user.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-red-100 text-[#b01622] flex items-center justify-center font-bold text-xs shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">{user.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-xs">{user.email}</td>
                      <td className="px-6 py-4 text-gray-600 text-xs font-mono">
                        {user.mobile_number || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block bg-red-50 text-[#b01622] text-xs font-semibold px-2.5 py-1 rounded-md">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {(!user.status || String(user.status).toLowerCase() === 'active') ? (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 text-xs font-semibold px-2.5 py-1 rounded-full border border-red-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-3 text-gray-400">
                          <button
                            onClick={() => handleOpenEditModal(user)}
                            className="p-1 hover:text-[#b01622] transition-colors"
                            title="Edit User"
                          >
                            <i className="fa-regular fa-pen-to-square text-sm"></i>
                          </button>
                          <button
                            onClick={() => setDeleteTargetUser(user)}
                            className="p-1 hover:text-red-600 transition-colors"
                            title="Delete User"
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
          totalItems={filteredUsers.length}
          itemsPerPage={itemsPerPage}
          onPageChange={(page) => setCurrentPage(page)}
          onItemsPerPageChange={(num) => {
            setItemsPerPage(num);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* CREATE / EDIT USER MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 my-6">
            
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
              <h3 className="text-lg font-bold text-gray-900">
                {editingId ? 'Edit User Profile' : 'Create New User Account'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Arvind Varma"
                  required
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="e.g. arvind@rudrajewellers.com"
                  required
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors"
                />
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  name="mobile_number"
                  value={formData.mobile_number}
                  onChange={handleChange}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors"
                />
              </div>

              {/* Role & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Assigned Role
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors"
                  >
                    {rolesList.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Account Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Password {editingId && <span className="text-gray-400 font-normal">(Leave blank to keep current)</span>}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      required={!editingId}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                    >
                      <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="confirm_password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required={!editingId && !!formData.password}
                    className={`w-full px-4 py-2.5 bg-white border rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-colors ${
                      formData.confirm_password && formData.password !== formData.confirm_password
                        ? 'border-red-500 bg-red-50/20'
                        : 'border-gray-200 focus:border-[#b01622]'
                    }`}
                  />
                  {formData.confirm_password && formData.password !== formData.confirm_password && (
                    <p className="text-[10px] text-red-500 font-semibold mt-1">Passwords do not match</p>
                  )}
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#b01622] hover:bg-[#90121b] text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
                >
                  {editingId ? 'Update User' : 'Save User Account'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={!!deleteTargetUser}
        title="Delete User Account?"
        message={
          deleteTargetUser
            ? `Are you sure you want to delete the user account for "${deleteTargetUser.name}" (${deleteTargetUser.email})? This user will no longer be able to log into the system.`
            : ''
        }
        confirmText="Delete User"
        cancelText="Cancel"
        loading={deleting}
        onConfirm={handleConfirmDeleteUser}
        onCancel={() => setDeleteTargetUser(null)}
      />

    </div>
  );
}
