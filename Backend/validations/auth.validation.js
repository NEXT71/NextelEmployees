import Joi from "joi";

const validateRegister = (data) => {
  const schema = Joi.object({
    username: Joi.string().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('admin', 'employee').required(),
    employeeId: Joi.when('role', {
      is: 'employee',
      then: Joi.string().required(),
      otherwise: Joi.string().optional()
    })
  });

  return schema.validate(data);
};

const validateLogin = (data) => {
  const schema = Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required()
  });

  return schema.validate(data);
};

export {validateLogin, validateRegister}