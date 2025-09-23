import Joi from 'joi';

// Validation for employee registration (admin only)
export const validateEmployeeRegister = (data) => {
  const schema = Joi.object({
    username: Joi.string().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    employeeId: Joi.string().required()
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