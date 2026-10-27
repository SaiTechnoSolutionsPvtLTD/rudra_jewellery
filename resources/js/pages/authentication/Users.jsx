import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import ConfirmModal from '../../components/ConfirmModal';
import Pagination from '../../components/Pagination';
import {
  validatePersonName,
  handlePersonNameKeyDown,
  validateMobile,
  handleMobileKeyDown,
  sanitizeMobile,
  validateEmail
} from '../../utils/validationUtils';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [rolesList, setRolesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const { showToast } = useToast();
  const { user: currentUser, updateUser } = useAuth();

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  // Delete Confirm Modal State
  const [deleteTargetUser, setDeleteTargetUser] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile_number: '',
    role: 'Staff',
    status: 'active',
    avatar: '',
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
        setRolesList(['Super Admin', 'Admin', 'Manager', 'Staff']);
      }
    } catch (err) {
      setRolesList(['Super Admin', 'Admin', 'Manager', 'Staff']);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setAvatarFile(null);
    setFormErrors({});
    setFormData({
      name: '',
      email: '',
      mobile_number: '',
      role: rolesList[0] || 'Staff',
      status: 'active',
      avatar: '',
      password: '',
      confirm_password: ''
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (user) => {
    setEditingId(user.id);
    setAvatarFile(null);
    setFormErrors({});
    setFormData({
      name: user.name || '',
      email: user.email || '',
      mobile_number: user.mobile_number || '',
      role: user.role || 'Staff',
      status: user.status || 'active',
      avatar: user.avatar || user.avatar_url || '',
      password: '',
      confirm_password: ''
    });
    setShowModal(true);
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      showToast('Please upload a supported image format (JPEG, PNG, or WebP).', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size must not exceed the allowed limit of 5 MB.', 'error');
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => ({ ...prev, avatar: reader.result }));
    };
    reader.onerror = () => {
      showToast('Image upload failed. Please try again.', 'error');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setFormData(prev => ({ ...prev, avatar: '' }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (name === 'email') {
      finalValue = String(value || '').toLowerCase().replace(/\s+/g, '');
    } else if (name === 'mobile_number') {
      finalValue = sanitizeMobile(value);
    }
    setFormData(prev => ({ ...prev, [name]: finalValue }));

    // Dynamic field validation
    if (name === 'name') {
      const err = validatePersonName(finalValue, 'Full Name', true);
      setFormErrors(prev => ({ ...prev, name: err }));
    } else if (name === 'email') {
      const err = validateEmail(finalValue, 'Email Address', true);
      setFormErrors(prev => ({ ...prev, email: err }));
    } else if (name === 'mobile_number') {
      const err = validateMobile(finalValue, 'Mobile Number', false);
      setFormErrors(prev => ({ ...prev, mobile_number: err }));
    } else if (name === 'confirm_password' || name === 'password') {
      if (formErrors.confirm_password || formErrors.password) {
        setFormErrors(prev => ({ ...prev, password: null, confirm_password: null }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Comprehensive field validations
    const errors = {};
    const nameErr = validatePersonName(formData.name, 'Full Name', true);
    if (nameErr) errors.name = nameErr;

    const emailErr = validateEmail(formData.email, 'Email Address', true);
    if (emailErr) errors.email = emailErr;

    const mobileErr = validateMobile(formData.mobile_number, 'Mobile Number', false);
    if (mobileErr) errors.mobile_number = mobileErr;

    if (!editingId) {
      if (!formData.password) {
        errors.password = 'Please enter a Password for the user';
      } else if (formData.password.length < 6) {
        errors.password = 'Password must be at least 6 characters long';
      }
      if (formData.password && formData.confirm_password && formData.password !== formData.confirm_password) {
        errors.confirm_password = 'Password and Confirm Password do not match!';
      }
    } else {
      if (formData.password) {
        if (formData.password.length < 6) {
          errors.password = 'Password must be at least 6 characters long';
        }
        if (formData.password !== formData.confirm_password) {
          errors.confirm_password = 'Password and Confirm Password do not match!';
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showToast(Object.values(errors)[0], 'error', 'Validation Error');
      return;
    }

    if (editingId) {
      // 1. Immediately close modal and update table data with zero delay
      setShowModal(false);

      const previousUsers = [...users];
      setUsers(prev => prev.map(u => {
        if (u.id === editingId) {
          return {
            ...u,
            name: formData.name,
            email: formData.email,
            mobile_number: formData.mobile_number,
            role: formData.role,
            status: formData.status || 'active',
            avatar: formData.avatar || u.avatar,
            avatar_url: formData.avatar || u.avatar_url,
          };
        }
        return u;
      }));

      // 2. Persist update in background
      (async () => {
        try {
          const payload = new FormData();
          payload.append('name', formData.name);
          payload.append('email', formData.email);
          payload.append('mobile_number', formData.mobile_number || '');
          payload.append('role', formData.role);
          payload.append('status', formData.status || 'active');

          if (formData.password) {
            payload.append('password', formData.password);
          }

          if (avatarFile) {
            payload.append('avatar_file', avatarFile);
            payload.append('avatar', avatarFile);
          } else if (formData.avatar) {
            payload.append('avatar', formData.avatar);
          } else {
            payload.append('avatar', '');
          }

          payload.append('_method', 'PUT');
          const res = await api.post(`/users/${editingId}`, payload, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          const savedUser = res.data?.user || res.data;
          if (savedUser) {
            setUsers(prev => prev.map(u => u.id === editingId ? { ...u, ...savedUser } : u));
            if (currentUser && (currentUser.id === editingId || currentUser.email === formData.email || currentUser.name === formData.name)) {
              if (updateUser) updateUser(savedUser);
            }
          }
          showToast(`User "${formData.name}" updated successfully!`, 'success', 'Updated');
        } catch (err) {
          console.error(err);
          setUsers(previousUsers);
          showToast(err.response?.data?.message || 'Failed to update user details', 'error', 'Operation Failed');
        }
      })();
      return;
    }

    try {
      const payload = new FormData();
      payload.append('name', formData.name);
      payload.append('email', formData.email);
      payload.append('mobile_number', formData.mobile_number || '');
      payload.append('role', formData.role);
      payload.append('status', formData.status || 'active');

      if (formData.password) {
        payload.append('password', formData.password);
      }

      if (avatarFile) {
        payload.append('avatar_file', avatarFile);
        payload.append('avatar', avatarFile);
      } else if (formData.avatar) {
        payload.append('avatar', formData.avatar);
      } else {
        payload.append('avatar', '');
      }

      const res = await api.post('/users', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const savedUser = res.data?.user || res.data;
      if (savedUser) {
        setUsers(prev => [savedUser, ...prev]);
      }
      setShowModal(false);
      showToast(`New user "${formData.name}" created successfully!`, 'success', 'Created');
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
                <th className="px-6 py-4 text-center w-14">S.No</th>
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
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-400">
                    <i className="fa-solid fa-circle-notch fa-spin mr-2"></i> Loading user accounts...
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-400">
                    No user accounts found.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user, idx) => {
                  const serialNo = (currentPage - 1) * itemsPerPage + idx + 1;
                  const initials = (user.name || 'U').split(' ').map(n => n[0]).join('');
                  return (
                    <tr key={user.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4 text-center font-mono text-gray-500 font-semibold">
                        {serialNo}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {user.avatar || user.avatar_url ? (
                            <img
                              src={user.avatar || user.avatar_url}
                              alt={user.name}
                              className="w-10 h-10 rounded-full object-cover border border-stone-200 shadow-xs shrink-0"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=b01622&color=ffffff&bold=true&size=128`;
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-red-100 text-[#b01622] flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                              {initials}
                            </div>
                          )}
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
              
              {/* Profile Photo Uploader */}
              <div className="flex items-center gap-4 bg-stone-50 p-3.5 rounded-xl border border-stone-200/80">
                <div className="relative shrink-0">
                  {formData.avatar ? (
                    <img
                      src={formData.avatar}
                      alt="Profile Preview"
                      className="w-16 h-16 rounded-full object-cover border-2 border-[#b01622] shadow-sm"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-red-100 text-[#b01622] border-2 border-dashed border-red-200 flex items-center justify-center text-xl font-bold">
                      <i className="fa-solid fa-user"></i>
                    </div>
                  )}
                  <label
                    htmlFor="user-avatar-upload"
                    className="absolute bottom-0 right-0 w-6 h-6 bg-[#b01622] hover:bg-[#8f1019] text-white rounded-full flex items-center justify-center text-xs shadow-md cursor-pointer transition-colors"
                    title="Upload Profile Photo"
                  >
                    <i className="fa-solid fa-camera text-[10px]"></i>
                  </label>
                  <input
                    id="user-avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-800">
                    Profile Photo / Image
                  </label>
                  <p className="text-[11px] text-gray-500 leading-tight">
                    Upload PNG, JPG, or GIF (max 5MB).
                  </p>
                  <div className="flex items-center gap-2 pt-0.5">
                    <label
                      htmlFor="user-avatar-upload"
                      className="px-3 py-1 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 rounded-lg text-xs font-semibold cursor-pointer transition-colors inline-block"
                    >
                      {formData.avatar ? 'Change Photo' : 'Upload Photo'}
                    </label>
                    {formData.avatar && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="px-2.5 py-1 text-red-600 hover:text-red-800 text-xs font-semibold transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  onKeyDown={handlePersonNameKeyDown}
                  placeholder="e.g. Arvind Varma"
                  required
                  className={`w-full px-4 py-2.5 bg-white border rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-colors ${
                    formErrors.name ? 'border-red-500 bg-red-50/20' : 'border-gray-200 focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622]'
                  }`}
                />
                {formErrors.name && (
                  <p className="text-[11px] text-red-500 mt-1 font-medium">{formErrors.name}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="e.g. arvind@rudrajewellers.com"
                  required
                  className={`w-full px-4 py-2.5 bg-white border rounded-xl text-sm lowercase text-gray-900 placeholder-gray-400 focus:outline-none transition-colors ${
                    formErrors.email ? 'border-red-500 bg-red-50/20' : 'border-gray-200 focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622]'
                  }`}
                />
                {formErrors.email && (
                  <p className="text-[11px] text-red-500 mt-1 font-medium">{formErrors.email}</p>
                )}
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
                  onKeyDown={handleMobileKeyDown}
                  maxLength={10}
                  placeholder="10-digit mobile number (e.g. 9876543210)"
                  className={`w-full px-4 py-2.5 bg-white border rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-colors ${
                    formErrors.mobile_number ? 'border-red-500 bg-red-50/20' : 'border-gray-200 focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622]'
                  }`}
                />
                {formErrors.mobile_number && (
                  <p className="text-[11px] text-red-500 mt-1 font-medium">{formErrors.mobile_number}</p>
                )}
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
                      className={`w-full px-4 py-2.5 bg-white border rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-colors pr-10 ${
                        formErrors.password ? 'border-red-500 bg-red-50/20' : 'border-gray-200 focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                    >
                      <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                  {formErrors.password && (
                    <p className="text-[11px] text-red-500 mt-1 font-medium">{formErrors.password}</p>
                  )}
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
                      formErrors.confirm_password || (formData.confirm_password && formData.password !== formData.confirm_password)
                        ? 'border-red-500 bg-red-50/20'
                        : 'border-gray-200 focus:border-[#b01622]'
                    }`}
                  />
                  {(formErrors.confirm_password || (formData.confirm_password && formData.password !== formData.confirm_password)) && (
                    <p className="text-[10px] text-red-500 font-semibold mt-1">
                      {formErrors.confirm_password || 'Passwords do not match'}
                    </p>
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
