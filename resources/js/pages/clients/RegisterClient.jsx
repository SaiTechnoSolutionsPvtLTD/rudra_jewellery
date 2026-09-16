import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function RegisterClient() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [membershipPlans, setMembershipPlans] = useState([]);

  const [formData, setFormData] = useState({
    client_code: '',
    fullName: '',
    gender: 'female',
    dob: '',
    anniversaryDate: '',
    primaryPhone: '',
    secondaryPhone: '',
    email: '',
    aadharNumber: '',
    panNumber: '',
    streetAddress: '',
    city: '',
    state: '',
    zipCode: '',
    companyName: '',
    gstNumber: '',
    gstPercentage: '',
    designation: '',
    membershipTier: '',
    status: 'active',
    quickNotes: ''
  });

  const [avatarFile, setAvatarFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const fetchClientCode = async () => {
    try {
      setGeneratingCode(true);
      const res = await api.get('/clients/generate-code');
      if (res.data && res.data.client_code) {
        setFormData(prev => ({ ...prev, client_code: res.data.client_code }));
      }
    } catch (err) {
      console.error('Error generating client code:', err);
    } finally {
      setGeneratingCode(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch Master Membership Plans dynamically
      const memRes = await api.get('/memberships');
      setMembershipPlans(memRes.data);

      if (isEditMode) {
        const res = await api.get(`/clients/${id}`);
        const data = res.data;
        setFormData({
          client_code: data.client_code || '',
          fullName: data.full_name || '',
          gender: data.gender || 'female',
          dob: data.dob ? data.dob.split('T')[0] : '',
          anniversaryDate: data.anniversary_date ? data.anniversary_date.split('T')[0] : '',
          primaryPhone: data.primary_phone || '',
          secondaryPhone: data.secondary_phone || '',
          email: data.email || '',
          aadharNumber: data.aadhar_number || '',
          panNumber: data.pan_number || '',
          streetAddress: data.street_address || '',
          city: data.city || '',
          state: data.state || '',
          zipCode: data.zip_code || '',
          companyName: data.company_name || '',
          gstNumber: data.gst_number || '',
          gstPercentage: data.gst_percentage || '',
          designation: data.designation || '',
          membershipTier: data.membership_tier || (memRes.data.length > 0 ? memRes.data[0].code : ''),
          status: data.status || 'active',
          quickNotes: data.quick_notes || ''
        });

        if (data.avatar_url) {
          setPhotoPreview(data.avatar_url);
        }
      } else {
        await fetchClientCode();
        if (memRes.data.length > 0) {
          setFormData(prev => ({ ...prev, membershipTier: memRes.data[0].code }));
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load client or membership data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'client_code') {
      setFormData(prev => ({ ...prev, [name]: value.toUpperCase() }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handlePhotoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const missing = [];
    if (!formData.fullName?.trim()) missing.push('Full Name');
    if (!formData.primaryPhone?.trim()) missing.push('Primary Mobile');
    if (!formData.streetAddress?.trim()) missing.push('Street Address');
    if (!formData.city?.trim()) missing.push('City');
    if (!formData.state?.trim()) missing.push('State');
    if (!formData.zipCode?.trim()) missing.push('Zip Code');

    if (missing.length > 0) {
      showToast(`Please enter all required fields: ${missing.join(', ')}`, 'error', 'Validation Error');
      return;
    }

    setSaving(true);

    try {
      const payload = new FormData();
      payload.append('client_code', formData.client_code || '');
      payload.append('full_name', formData.fullName || '');
      payload.append('fullName', formData.fullName || '');
      payload.append('gender', formData.gender || 'female');
      payload.append('dob', formData.dob || '');
      payload.append('anniversary_date', formData.anniversaryDate || '');
      payload.append('anniversaryDate', formData.anniversaryDate || '');
      payload.append('primary_phone', formData.primaryPhone || '');
      payload.append('primaryPhone', formData.primaryPhone || '');
      payload.append('secondary_phone', formData.secondaryPhone || '');
      payload.append('secondaryPhone', formData.secondaryPhone || '');
      payload.append('email', formData.email || '');
      payload.append('aadhar_number', formData.aadharNumber || '');
      payload.append('aadharNumber', formData.aadharNumber || '');
      payload.append('pan_number', formData.panNumber || '');
      payload.append('panNumber', formData.panNumber || '');
      payload.append('street_address', formData.streetAddress || '');
      payload.append('streetAddress', formData.streetAddress || '');
      payload.append('city', formData.city || '');
      payload.append('state', formData.state || '');
      payload.append('zip_code', formData.zipCode || '');
      payload.append('zipCode', formData.zipCode || '');
      payload.append('company_name', formData.companyName || '');
      payload.append('companyName', formData.companyName || '');
      payload.append('gst_number', formData.gstNumber || '');
      payload.append('gstNumber', formData.gstNumber || '');
      payload.append('gst_percentage', formData.gstPercentage || '');
      payload.append('gstPercentage', formData.gstPercentage || '');
      payload.append('designation', formData.designation || '');
      payload.append('membership_tier', formData.membershipTier || '');
      payload.append('membershipTier', formData.membershipTier || '');
      payload.append('status', formData.status || 'active');
      payload.append('quick_notes', formData.quickNotes || '');
      payload.append('quickNotes', formData.quickNotes || '');

      if (avatarFile) {
        payload.append('avatar', avatarFile);
      }

      if (isEditMode) {
        payload.append('_method', 'PUT');
        await api.post(`/clients/${id}`, payload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        showToast('Client details updated successfully!', 'success', 'Updated');
      } else {
        await api.post('/clients', payload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        showToast('New Client registered successfully!', 'success', 'Registered');
      }

      navigate('/clients');
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || 'Error saving client details.';
      showToast(errorMsg, 'error', 'Operation Failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full py-12 text-center text-gray-400">
        <i className="fa-solid fa-circle-notch fa-spin mr-2 text-xl"></i> Loading client form...
      </div>
    );
  }

  return (
    <div className="w-full pb-12">
      <form onSubmit={handleSubmit}>
        {/* Top Breadcrumb & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
              CUSTOMERS <span className="text-gray-300 mx-1">▸</span> <span className="text-gray-500">{isEditMode ? 'EDIT CLIENT' : 'NEW CLIENT'}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{isEditMode ? 'Edit Client Profile' : 'Register New Client'}</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <Link to="/clients" className="px-4 py-2.5 border border-gray-200 bg-white rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-[#b01622] hover:bg-[#90121b] text-white text-sm font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
            >
              {saving ? (
                <i className="fa-solid fa-circle-notch fa-spin"></i>
              ) : (
                <>
                  <i className="fa-regular fa-floppy-disk text-xs"></i>
                  {isEditMode ? 'Update Client Profile' : 'Save Client'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Main Layout: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Personal Information */}
            <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-5">
                <div className="flex items-center gap-2.5 text-sm font-bold text-[#b01622]">
                  <i className="fa-regular fa-user text-base"></i>
                  <span>Personal Information</span>
                </div>

                {/* Auto Client Code Generator */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-medium">Client Code:</span>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      name="client_code"
                      value={formData.client_code}
                      onChange={handleChange}
                      placeholder="RJ-CL-1001"
                      className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded font-mono text-xs font-bold text-gray-800 w-28 uppercase focus:bg-white focus:border-[#b01622]"
                    />
                    {!isEditMode && (
                      <button
                        type="button"
                        onClick={fetchClientCode}
                        disabled={generatingCode}
                        className="ml-1 text-[#b01622] hover:text-[#90121b] p-1 cursor-pointer"
                        title="Auto Generate Code"
                      >
                        <i className={`fa-solid fa-arrows-rotate text-xs ${generatingCode ? 'fa-spin' : ''}`}></i>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Full Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="e.g. Alexandra Sterling"
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#b01622]">
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Date of Birth (Optional)</label>
                  <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#b01622]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Anniversary Date (Optional)</label>
                  <input type="date" name="anniversaryDate" value={formData.anniversaryDate} onChange={handleChange} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#b01622]" />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-6">
              <div className="flex items-center gap-2.5 text-sm font-bold text-[#b01622] mb-6">
                <i className="fa-regular fa-address-book text-base"></i>
                <span>Contact Information</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Primary Phone <span className="text-red-500">*</span></label>
                  <input type="text" name="primaryPhone" value={formData.primaryPhone} onChange={handleChange} placeholder="+91 98765 43210" required className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Secondary Phone (Optional)</label>
                  <input type="text" name="secondaryPhone" value={formData.secondaryPhone} onChange={handleChange} placeholder="+91 98765 43211" className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622]" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Email Address (Optional)</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="alexandra@example.com" className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622]" />
              </div>
            </div>

            {/* Identification & Address */}
            <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-6">
              <div className="flex items-center gap-2.5 text-sm font-bold text-[#b01622] mb-6">
                <i className="fa-regular fa-id-card text-base"></i>
                <span>Identification & Address</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Aadhar Number (Optional)</label>
                  <input type="text" name="aadharNumber" value={formData.aadharNumber} onChange={handleChange} placeholder="XXXX XXXX XXXX" className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">PAN Number (Optional)</label>
                  <input type="text" name="panNumber" value={formData.panNumber} onChange={handleChange} placeholder="ABCDE1234F" className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622]" />
                </div>
              </div>

              <div className="mb-5">
                <label className="block text-xs font-semibold text-gray-700 mb-2">Street Address <span className="text-red-500">*</span></label>
                <input type="text" name="streetAddress" value={formData.streetAddress} onChange={handleChange} placeholder="Flat No, Building, Street Name" required className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622]" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">City <span className="text-red-500">*</span></label>
                  <input type="text" name="city" value={formData.city} onChange={handleChange} placeholder="e.g. Chennai" required className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#b01622]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">State <span className="text-red-500">*</span></label>
                  <input type="text" name="state" value={formData.state} onChange={handleChange} placeholder="e.g. Tamil Nadu" required className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#b01622]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Zip Code <span className="text-red-500">*</span></label>
                  <input type="text" name="zipCode" value={formData.zipCode} onChange={handleChange} placeholder="600028" required className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#b01622]" />
                </div>
              </div>
            </div>

            {/* Corporate & GST Details */}
            <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-6">
              <div className="flex items-center gap-2.5 text-sm font-bold text-[#b01622] mb-6">
                <i className="fa-solid fa-building text-base"></i>
                <span>Corporate & GST Details (Optional)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Company Name (Optional)</label>
                  <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} placeholder="e.g. Regal Textiles Pvt Ltd" className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#b01622]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">GST Number (Optional)</label>
                  <input type="text" name="gstNumber" value={formData.gstNumber} onChange={handleChange} placeholder="33ABCDE1234F1Z5" className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#b01622]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">GST Percentage (%) (Optional)</label>
                  <input type="text" name="gstPercentage" value={formData.gstPercentage} onChange={handleChange} placeholder="e.g. 3% or 18%" className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#b01622]" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Designation (Optional)</label>
                <input type="text" name="designation" value={formData.designation} onChange={handleChange} placeholder="e.g. Managing Director" className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#b01622]" />
              </div>
            </div>
          </div>

          {/* Right Column (Avatar & Settings) */}
          <div className="space-y-6">
            
            {/* Client Photo Card */}
            <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-6 text-center">
              <label className="block text-xs font-bold text-gray-700 mb-4 uppercase tracking-wider">
                Client Profile Photo
              </label>

              <div className="flex flex-col items-center">
                {photoPreview ? (
                  <div className="relative group w-32 h-32 rounded-full border-2 border-[#b01622] overflow-hidden mb-4 bg-gray-50 shadow-sm">
                    <img src={photoPreview} alt="Client Avatar Preview" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-full border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center mb-4 text-gray-400">
                    <i className="fa-solid fa-user text-4xl"></i>
                  </div>
                )}

                <label className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-gray-200">
                  <i className="fa-solid fa-camera mr-1.5"></i>
                  {photoPreview ? 'Change Photo' : 'Upload Photo'}
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                </label>
              </div>
            </div>

            {/* Account & Membership Settings (Dynamic from Master Memberships Table) */}
            <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2.5 text-sm font-bold text-[#b01622] border-b border-gray-100 pb-3">
                <i className="fa-solid fa-sliders text-base"></i>
                <span>Membership & Status</span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-gray-700">Membership Tier (From Masters)</label>
                  <span className="text-[10px] text-gray-400 font-normal">Dynamic ({membershipPlans.length} Plans)</span>
                </div>
                <select
                  name="membershipTier"
                  value={formData.membershipTier}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#b01622]"
                >
                  <option value="">-- Select Membership Plan --</option>
                  {membershipPlans.map((plan) => (
                    <option key={plan.id} value={plan.code}>
                      {plan.name} ({plan.code}) - {plan.discount_percentage}% OFF
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Account Status</label>
                <select name="status" value={formData.status} onChange={handleChange} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#b01622]">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Quick Notes */}
            <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-6">
              <label className="block text-xs font-bold text-gray-700 mb-3 uppercase tracking-wider">
                Quick Preferences & Notes
              </label>
              <textarea
                name="quickNotes"
                rows="4"
                value={formData.quickNotes}
                onChange={handleChange}
                placeholder="Client preferences, metal choice (22K antique, solitaire diamonds), anniversary reminders..."
                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622] resize-none"
              ></textarea>
            </div>

          </div>
        </div>

      </form>
    </div>
  );
}
