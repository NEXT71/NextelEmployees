import { useState } from 'react';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { authAPI } from '../../utils/api';
import Dialog from '../ui/Dialog';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import { Field, Input, Select, Textarea } from '../ui/Field';

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

    if (score < 3) return { score, label: 'Weak', color: 'text-absent', bar: 'bg-absent' };
    if (score < 4) return { score, label: 'Medium', color: 'text-late', bar: 'bg-late' };
    return { score, label: 'Strong', color: 'text-present', bar: 'bg-present' };
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

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Add employee"
      description="Only name and role are required. Anything left blank is generated for you."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="create-employee-form" icon={UserPlus} disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
        </>
      }
    >
      <form id="create-employee-form" onSubmit={handleRegisterEmployee} className="space-y-5">
        {error && <Alert>{error}</Alert>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full name" htmlFor="emp-name">
            <Input
              id="emp-name"
              type="text"
              name="name"
              value={employeeForm.name}
              onChange={handleEmployeeFormChange}
              required
            />
          </Field>
          <Field label="Role" htmlFor="emp-role" hint="Sets the account type, department and default password.">
            <Select id="emp-role" name="role" value={employeeForm.role} onChange={handleEmployeeFormChange} required>
              <option value="CSR">CSR</option>
              <option value="Closer/TL">Closer/TL</option>
              <option value="QA Manager">QA Manager</option>
              <option value="HR">HR</option>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Email (optional)" htmlFor="emp-email">
            <Input
              id="emp-email"
              type="email"
              name="email"
              value={employeeForm.email}
              onChange={handleEmployeeFormChange}
              placeholder="Generated if blank"
            />
          </Field>
          <Field label="Employee ID (optional)" htmlFor="emp-id">
            <Input
              id="emp-id"
              type="text"
              name="employeeId"
              value={employeeForm.employeeId}
              onChange={handleEmployeeFormChange}
              placeholder="Generated if blank"
            />
          </Field>
        </div>

        <Field
          label="Password (optional)"
          htmlFor="emp-password"
          hint="Leave blank to use the role's default password. Otherwise: 6+ characters with an uppercase letter, a lowercase letter and a number."
        >
          <div className="relative">
            <Input
              id="emp-password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete="new-password"
              value={employeeForm.password}
              onChange={handleEmployeeFormChange}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-2 rounded-md text-muted hover:text-ink"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {employeeForm.password && (
            <div className="mt-2 flex items-center gap-3">
              <div className="flex-1 h-1.5 rounded-full bg-paper overflow-hidden">
                <div className={`h-full rounded-full ${passwordStrength.bar}`} style={{ width: `${(passwordStrength.score / 5) * 100}%` }} />
              </div>
              <span className={`text-xs font-medium ${passwordStrength.color}`}>{passwordStrength.label}</span>
            </div>
          )}
        </Field>

        <Field label="Phone (optional)" htmlFor="emp-phone">
          <Input
            id="emp-phone"
            type="tel"
            name="contact.phone"
            value={employeeForm.contact.phone}
            onChange={handleEmployeeFormChange}
          />
        </Field>

        <Field label="Address (optional)" htmlFor="emp-address">
          <Textarea
            id="emp-address"
            name="contact.address"
            value={employeeForm.contact.address}
            onChange={handleEmployeeFormChange}
            rows={2}
            className="resize-none"
          />
        </Field>
      </form>
    </Dialog>
  );
};

export default CreateEmployeeModal;