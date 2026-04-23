import React, { useState } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { authAPI } from '../../utils/api';

const CreateEmployeeModal = ({ isOpen, onClose, onEmployeeAdded }) => {
  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    role: 'CSR',
    email: '',
    password: '',
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
      // Validate required fields
      if (!employeeForm.name || !employeeForm.role) {
        setError('Name and role are required');
        setLoading(false);
        return;
      }

      if (employeeForm.password) {
        if (employeeForm.password.length < 6) {
          setError('Password must be at least 6 characters long');
          setLoading(false);
          return;
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/;
        if (!passwordRegex.test(employeeForm.password)) {
          setError('Password must contain at least one uppercase letter, one lowercase letter, and one number');
          setLoading(false);
          return;
        }
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
          name: '',
          role: 'CSR',
          email: '',
          password: '',
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
    const { name, value, checked } = e.target;
    
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
    } else if (name === 'role') {
      setEmployeeForm({
        ...employeeForm,
        role: value
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

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Full Name <span className="text-cyan-400">*</span></label>
            <input
              type="text"
              name="name"
              value={employeeForm.name}
              onChange={handleEmployeeFormChange}
              placeholder="Enter full name"
              className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Role <span className="text-cyan-400">*</span></label>
            <select
              name="role"
              value={employeeForm.role}
              onChange={handleEmployeeFormChange}
              className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-4 py-3 text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
              required
            >
              <option value="CSR" className="bg-slate-800">CSR</option>
              <option value="Closer/TL" className="bg-slate-800">Closer/TL</option>
              <option value="QA Manager" className="bg-slate-800">QA Manager</option>
            </select>
            <p className="text-xs text-slate-400 mt-2">This determines the account type, department, and default password if you leave it blank.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Email <span className="text-slate-500">(optional)</span></label>
            <input
              type="email"
              name="email"
              value={employeeForm.email}
              onChange={handleEmployeeFormChange}
              placeholder="Leave blank to auto-generate"
              className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Password
              <span className="text-slate-500 ml-1">(optional)</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={employeeForm.password}
                onChange={handleEmployeeFormChange}
                placeholder="Leave blank to auto-generate from role"
                className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-4 py-3 pr-12 text-white placeholder-slate-400 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2">If you leave this empty, the backend will generate the role-based default password.</p>
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
            <label className="block text-sm font-medium text-slate-300 mb-2">Employee ID <span className="text-slate-500">(optional)</span></label>
            <input
              type="text"
              name="employeeId"
              value={employeeForm.employeeId}
              onChange={handleEmployeeFormChange}
              placeholder="Leave blank to auto-generate"
              className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Phone <span className="text-slate-500">(optional)</span></label>
            <input
              type="tel"
              name="contact.phone"
              value={employeeForm.contact.phone}
              onChange={handleEmployeeFormChange}
              placeholder="Optional contact number"
              className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Address <span className="text-slate-500">(optional)</span></label>
            <textarea
              name="contact.address"
              value={employeeForm.contact.address}
              onChange={handleEmployeeFormChange}
              placeholder="Optional address"
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