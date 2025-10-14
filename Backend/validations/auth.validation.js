import Joi from 'joi';

// Validation for employee registration (admin only)
export const validateEmployeeRegister = (data) => {
  const schema = Joi.object({
    firstName: Joi.string().min(2).max(50).pattern(/^[a-zA-Z\s]+$/).required()
      .messages({
        'string.pattern.base': 'First name can only contain letters and spaces'
      }),
    lastName: Joi.string().min(2).max(50).pattern(/^[a-zA-Z\s]+$/).required()
      .messages({
        'string.pattern.base': 'Last name can only contain letters and spaces'
      }),
    fatherName: Joi.string().min(2).max(50).pattern(/^[a-zA-Z\s]+$/).optional().allow('')
      .messages({
        'string.pattern.base': 'Father name can only contain letters and spaces'
      }),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(50)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/)
      .required()
      .messages({
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      }),
    department: Joi.string().min(2).max(50).required(),
    employeeId: Joi.string().pattern(/^[a-zA-Z0-9]{6,12}$/).required()
      .messages({
        'string.pattern.base': 'Employee ID must be 6-12 alphanumeric characters'
      }),
    hireDate: Joi.date().max('now').optional(),
    status: Joi.string().valid('Active', 'Inactive', 'On Leave').optional(),
    salary: Joi.object({
      baseSalary: Joi.number().min(0).optional(),
      bonuses: Joi.number().min(0).optional(),
      deductions: Joi.number().min(0).optional()
    }).optional(),
    contact: Joi.object({
      phone: Joi.string().pattern(/^[0-9]{10,15}$/).optional().allow('')
        .messages({
          'string.pattern.base': 'Phone number must be 10-15 digits'
        }),
      address: Joi.string().max(200).optional().allow(''),
      emergencyContact: Joi.string().pattern(/^[0-9]{10,15}$/).optional().allow('')
        .messages({
          'string.pattern.base': 'Emergency contact must be 10-15 digits'
        })
    }).optional()
  });
  return schema.validate(data);
};

// Validation for login (shared) - accepts username or email
export const validateLogin = (data) => {
  const schema = Joi.object({
    email: Joi.string().min(3).required(), // Changed to allow username or email
    password: Joi.string().required()
  });
  return schema.validate(data);
};