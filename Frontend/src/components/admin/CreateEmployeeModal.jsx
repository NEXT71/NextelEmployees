import React, { useState } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { authAPI } from '../../utils/api';
import { DEPARTMENTS } from '../../utils/constants';

const CreateEmployeeModal = ({ isOpen, onClose, onEmployeeAdded }) => {
  const [employeeForm, setEmployeeForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    department: 'Sales',
    employeeId: '',
    hireDate: new Date().toISOString().split('T')[0],
    status: 'Active',
    contact: {
      phone: '',
      address: ''
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Password strength checker
  const getPasswordStrength = (password) => {
    if (!password) return { score: 0, label: '', color: '' };
    
    let score = 0;
    const checks = {
      length: password.length >= 6,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[@$!%*?&]/.test(password)
    };

    score = Object.values(checks).filter(Boolean).length;

    if (score < 3) return { score, label: 'Weak', color: 'text-red-400' };
    if (score < 4) return { score, label: 'Medium', color: 'text-yellow-400' };
    return { score, label: 'Strong', color: 'text-green-400' };
  };

  const passwordStrength = getPasswordStrength(employeeForm.password);

  const handleRegisterEmployee = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate required fields (same as inline modal)
      if (!employeeForm.firstName || !employeeForm.lastName || !employeeForm.email || 
          !employeeForm.password || !employeeForm.employeeId || !employeeForm.department) {
        setError('Please fill all required fields');
        setLoading(false);
        return;
      }

      // Validate password strength
      if (employeeForm.password.length < 6) {
        setError('Password must be at least 6 characters long');
        setLoading(false);
        return;
      }

      // Basic password strength check
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/;
      if (!passwordRegex.test(employeeForm.password)) {
        setError('Password must contain at least one uppercase letter, one lowercase letter, and one number');
        setLoading(false);
        return;
      }

      const response = await authAPI.registerEmployee(employeeForm);

      if (response.success) {
        setError('');
        
        // Show success message with username info
        const successMessage = response.data.username 
          ? `Employee registered successfully!\n\nLogin Credentials:\n• Username: ${response.data.username}\n• Email: ${response.data.email}\n• Password: [As set by admin]\n\nPlease share these credentials with the employee securely.`
          : 'Employee registered successfully!';
          
        alert(successMessage);
        
        // Reset form to default values (same as inline modal)
        setEmployeeForm({
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          department: 'Sales',
          employeeId: '',
          hireDate: new Date().toISOString().split('T')[0],
          status: 'Active',
          contact: {
            phone: '',
            address: ''
          }
        });
        
        if (onEmployeeAdded) {
          onEmployeeAdded();
        }
        
        onClose();
      }
    } catch (err) {
      if (err.message && err.message.includes('errors')) {
        // Handle validation errors from backend
        setError(err.message);
      } else {
        setError(err.message || 'Failed to register employee. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeFormChange = (e) => {
    const { name, value } = e.target;
    
    // Handle nested contact fields
    if (name.startsWith('contact.')) {
      const contactField = name.split('.')[1];
      setEmployeeForm({
        ...employeeForm,
        contact: {
          ...employeeForm.contact,
          [contactField]: value
        }
      });
    } else {
      setEmployeeForm({
        ...employeeForm,
        [name]: value
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-700/50 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm p-6 border-b border-slate-700/50 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Add New Employee</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleRegisterEmployee} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Form Fields matching inline modal exactly */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">First Name</label>
              <input
                type="text"
                name="firstName"
                value={employeeForm.firstName}
                onChange={handleEmployeeFormChange}
                className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Last Name</label>
              <input
                type="text"
                name="lastName"
                value={employeeForm.lastName}
                onChange={handleEmployeeFormChange}
                className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
            <input
              type="email"
              name="email"
              value={employeeForm.email}
              onChange={handleEmployeeFormChange}
              className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Password
              <span className="text-red-400 ml-1">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={employeeForm.password}
                onChange={handleEmployeeFormChange}
                placeholder="Create a secure password"
                className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-4 py-3 pr-12 text-white placeholder-slate-400 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Password must contain at least 6 characters with uppercase, lowercase, and number
            </p>
            {employeeForm.password && (
              <div className="mt-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-400">Strength:</span>
                  <span className={`text-xs font-medium ${passwordStrength.color}`}>
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-1.5 mt-1">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      passwordStrength.score < 3 
                        ? 'bg-red-500' 
                        : passwordStrength.score < 4 
                        ? 'bg-yellow-500' 
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Department</label>
            <select
              name="department"
              value={employeeForm.department}
              onChange={handleEmployeeFormChange}
              className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-4 py-3 text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
              required
            >
              {DEPARTMENTS.map(dept => (
                <option key={dept} value={dept} className="bg-slate-800">{dept}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Employee ID</label>
            <input
              type="text"
              name="employeeId"
              value={employeeForm.employeeId}
              onChange={handleEmployeeFormChange}
              className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Phone</label>
            <input
              type="tel"
              name="contact.phone"
              value={employeeForm.contact.phone}
              onChange={handleEmployeeFormChange}
              className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Address</label>
            <textarea
              name="contact.address"
              value={employeeForm.contact.address}
              onChange={handleEmployeeFormChange}
              rows={3}
              className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-700/50 hover:bg-slate-700 text-white rounded-lg font-medium transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-all duration-200"
            >
              {loading ? 'Creating...' : 'Register Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEmployeeModal;