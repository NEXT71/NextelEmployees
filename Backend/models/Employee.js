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
    required: true
  },
  salary: {
    baseSalary: Number,
    bonuses: Number,
    deductions: Number
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'On Leave'],
    default: 'Active'
  },
  fines: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fine'
  }],
  totalFines: {
    type: Number,
    default: 0
  },
  contact: {
    phone: String,
    address: String
  }
}, { timestamps: true });

const Employee = mongoose.model('Employee', employeeSchema);
export default Employee;