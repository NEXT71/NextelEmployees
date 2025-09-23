import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    unique: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  fatherName: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  department: {
    type: String,
    required: true,
    enum: ['Customer Service', 'Technical Support', 'Sales', 'Quality Assurance', 'HR']
  },
  position: {
    type: String,
    required: true
  },
  hireDate: {
    type: Date,
    default: Date.now
  },
  salary: {
    baseSalary: { type: Number, default: 0 },
    bonuses: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    history: [{
      date: { type: Date, default: Date.now },
      baseSalary: Number,
      bonuses: Number,
      deductions: Number,
      notes: String
    }]
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'On Leave'],
    default: 'Active'
  },
  contact: {
    phone: { type: String, default: '' },
    emergencyContact: { type: String, default: '' },
    address: { type: String, default: '' }
  },  
  // In Employee model
user: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  unique: true,
  sparse: true, // This allows multiple null values
  validate: {
    validator: async function(v) {
      if (!v) return true; // Allow null/undefined
      const user = await mongoose.model('User').findById(v);
      return !!user;
    },
    message: 'User reference is invalid'
  }
},
  lastSeen: {
    type: Date
  }
}, { timestamps: true });

// Ensure the user field has a proper sparse unique index
employeeSchema.index({ user: 1 }, { unique: true, sparse: true });

// Ensure email and employeeId are unique
employeeSchema.index({ email: 1 }, { unique: true });
employeeSchema.index({ employeeId: 1 }, { unique: true });

const Employee = mongoose.model('Employee', employeeSchema);
export default Employee;