import React, { useState, useEffect } from 'react';
import { Send, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { salesTargetAPI, employeeAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

const CSRSalesSubmission = ({ onBack }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    csrName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
    firstName: '',
    lastName: '',
    phone: '',
    state: '',
    zipCode: '',
    dids: '',
    closer: '',
    closerRef: '',
    submissionDate: new Date().toISOString().split('T')[0]
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [closers, setClosers] = useState([]);

  useEffect(() => {
    employeeAPI.getClosers().then(res => {
      if (res?.data) setClosers(res.data);
    }).catch(() => {});
  }, []);

  const handlechange = (e) => {
    const { name, value } = e.target;
    if (name === 'closerRef') {
      // Find the selected closer name for the text field
      const selected = closers.find(c => c._id === value);
      setFormData(prev => ({
        ...prev,
        closerRef: value,
        closer: selected ? `${selected.firstName} ${selected.lastName}` : ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    setError('');
  };

  const validateForm = () => {
    const { csrName, firstName, lastName, phone, state, zipCode, dids, closer } = formData;
    
    if (!csrName?.trim()) return 'CSR name is required';
    if (!firstName?.trim()) return 'Customer first name is required';
    if (!lastName?.trim()) return 'Customer last name is required';
    if (!phone?.trim()) return 'Customer phone is required';
    if (!state?.trim()) return 'Customer state is required';
    if (!zipCode?.trim()) return 'ZIP code is required';
    if (!dids?.trim()) return 'DIDs is required';
    if (!closer?.trim()) return 'Closer verified name is required';
    
    // Phone validation - basic check
    if (!/^[0-9+\-\s()]{7,}$/.test(phone)) {
      return 'Please enter a valid phone number';
    }
    
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      
      const payload = {
        agent: user._id,
        agentName: formData.csrName.trim(),
        agentPhone: user.phone || 'N/A',
        customer: {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phone: formData.phone.trim(),
          state: formData.state.trim(),
          zipCode: formData.zipCode.trim()
        },
        dids: formData.dids.trim(),
        closer: formData.closer.trim(),
        closerRef: formData.closerRef || undefined,
        saleDate: formData.submissionDate,
        submissionSource: 'CSR Portal'
      };

      console.log('📤 Submitting sales form with payload:', payload);

      const response = await salesTargetAPI.submitSalesForm(payload);

      console.log('📥 Submit response:', response);

      // Check for API error response
      if (response?.error) {
        let errorMsg = response.message || 'Failed to submit sales record';
        
        // Parse common error messages
        if (response.message?.includes('duplicate')) {
          errorMsg = '⚠️  You may have already submitted this sale. Please check your pending sales and try again with a different customer or DID.';
        } else if (response.message?.includes('already exists')) {
          errorMsg = '⚠️  A record with this customer/DID combination already exists. Please submit with different details.';
        }
        
        setError(errorMsg);
        console.error('❌ API Error:', response);
        return;
      }

      if (response) {
        setSuccess(`✅ Sales submission successful! Your record is pending admin approval.`);
        // Reset form
        setFormData({
          csrName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
          firstName: '',
          lastName: '',
          phone: '',
          state: '',
          zipCode: '',
          dids: '',
          closer: '',
          closerRef: '',
          submissionDate: new Date().toISOString().split('T')[0]
        });
        setShowPreview(false);
        
        // Auto-clear success message after 5 seconds
        setTimeout(() => setSuccess(''), 5000);
      } else {
        throw new Error('Failed to submit sales record');
      }
    } catch (err) {
      let errorMsg = err.message || 'Failed to submit sales record';
      
      // Parse HTTP error messages
      if (err.message?.includes('duplicate')) {
        errorMsg = '⚠️  Duplicate submission detected. This customer/DID may already be submitted.';
      }
      
      setError(errorMsg);
      console.error('❌ Submission error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setShowPreview(!showPreview);
  };

  const states = [
    'Punjab', 'Sindh', 'KPK', 'Balochistan', 'Gilgit-Baltistan', 
    'Azad Jammu & Kashmir', 'Islamabad', 'Federal'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Send className="text-cyan-400" size={32} />
            Submit Sales
          </h1>
          <p className="text-gray-400">Record a new customer sale for approval</p>
        </div>

        {/* Success Alert */}
        {success && (
          <div className="mb-6 p-4 rounded-lg bg-green-900/30 border border-green-600/50 flex items-start gap-3">
            <CheckCircle className="text-green-400 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-green-400 font-semibold">Success</p>
              <p className="text-green-300 text-sm mt-1">{success}</p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-900/30 border border-red-600/50 flex items-start gap-3">
            <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-red-400 font-semibold">Error</p>
              <p className="text-red-300 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Information Section */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 backdrop-blur">
            <h2 className="text-lg font-semibold text-cyan-400 mb-4">Customer Information</h2>
            
            <div className="grid grid-cols-2 gap-4">
              {/* First Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handlechange}
                  placeholder="Ahmed"
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                />
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handlechange}
                  placeholder="Hassan"
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handlechange}
                  placeholder="03001234567"
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                />
              </div>

              {/* ZIP Code */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  ZIP Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handlechange}
                  placeholder="54000"
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                />
              </div>

              {/* State */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  State/Province <span className="text-red-500">*</span>
                </label>
                <select
                  name="state"
                  value={formData.state}
                  onChange={handlechange}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-700/50 border border-slate-600 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                >
                  <option value="" className="bg-slate-800">Select State</option>
                  {states.map(state => (
                    <option key={state} value={state} className="bg-slate-800">{state}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Sale Details Section */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 backdrop-blur">
            <h2 className="text-lg font-semibold text-cyan-400 mb-4">Sale Details</h2>
            
            <div className="space-y-4">
              {/* CSR Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  CSR Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="csrName"
                  value={formData.csrName}
                  onChange={handlechange}
                  placeholder="Your full name"
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                />
                <p className="text-xs text-gray-400 mt-1">Auto-filled from your profile — edit if needed</p>
              </div>

              {/* DIDs */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  DIDs <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="dids"
                  value={formData.dids}
                  onChange={handlechange}
                  placeholder="e.g., DIDs-001 or DIDs-UK-100"
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                />
                <p className="text-xs text-gray-400 mt-1">The product/service sold</p>
              </div>

              {/* Closer */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Closer / Verifier <span className="text-red-500">*</span>
                </label>
                {closers.length > 0 ? (
                  <select
                    name="closerRef"
                    value={formData.closerRef}
                    onChange={handlechange}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-700/50 border border-slate-600 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                  >
                    <option value="" className="bg-slate-800">Select a Verifier</option>
                    {closers.map(c => (
                      <option key={c._id} value={c._id} className="bg-slate-800">
                        {c.firstName} {c.lastName}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    name="closer"
                    value={formData.closer}
                    onChange={handlechange}
                    placeholder="Name of the closer/verifier"
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                  />
                )}
                <p className="text-xs text-gray-400 mt-1">Select the verifier who closed this sale</p>
              </div>

              {/* Submission Date */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Sale Date
                </label>
                <input
                  type="date"
                  name="submissionDate"
                  value={formData.submissionDate}
                  onChange={handlechange}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-700/50 border border-slate-600 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                />
                <p className="text-xs text-gray-400 mt-1">When was this sale completed?</p>
              </div>
            </div>
          </div>



          {/* Preview Section */}
          {showPreview && (
            <div className="bg-amber-900/20 border border-amber-600/50 rounded-lg p-6 backdrop-blur">
              <h3 className="text-lg font-semibold text-amber-400 mb-4">Preview</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Customer Name</p>
                  <p className="text-white font-semibold">{formData.firstName} {formData.lastName}</p>
                </div>
                <div>
                  <p className="text-gray-400">Phone</p>
                  <p className="text-white font-semibold">{formData.phone}</p>
                </div>
                <div>
                  <p className="text-gray-400">Location</p>
                  <p className="text-white font-semibold">{formData.state}, {formData.zipCode}</p>
                </div>
                <div>
                  <p className="text-gray-400">DIDs</p>
                  <p className="text-white font-semibold">{formData.dids}</p>
                </div>
                <div>
                  <p className="text-gray-400">CSR Name</p>
                  <p className="text-white font-semibold">{formData.csrName}</p>
                </div>
                <div>
                  <p className="text-gray-400">Closer Verified Name</p>
                  <p className="text-white font-semibold">{formData.closer}</p>
                </div>
              </div>
              <p className="text-xs text-amber-300 mt-4">
                💡 Once submitted, this will be pending admin approval. Check your sales dashboard to track it.
              </p>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={handlePreview}
              disabled={loading}
              className="flex-1 px-6 py-3 rounded-lg border border-cyan-600 text-cyan-400 font-semibold hover:bg-cyan-600/10 hover:border-cyan-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {showPreview ? '✓ Preview OK' : 'Preview'}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send size={20} />
                  Submit Sale
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            All fields marked with <span className="text-red-500">*</span> are required
          </p>
        </form>
      </div>
    </div>
  );
};

export default CSRSalesSubmission;