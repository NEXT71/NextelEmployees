import Joi from "joi";

const validateEmployee = (data, isUpdate = false) => {
  const schema = Joi.object({
    employeeId: isUpdate ? Joi.string().optional() : Joi.string().required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    email: Joi.string().email().required(),
    department: Joi.string().valid(
      'Sales', 
      'Quality Assurance', 
      'HR'
    ).required(),
    hireDate: Joi.date().required(),
    salary: Joi.object({
      baseSalary: Joi.number().required(),
      bonuses: Joi.number().default(0),
      deductions: Joi.number().default(0)
    }).optional(), // Changed to optional
    status: Joi.string().valid('Active', 'Inactive', 'On Leave').default('Active'),
    contact: Joi.object({
      phone: Joi.string(),
      address: Joi.string()
    }).optional()
  });

  return schema.validate(data);
};

export  {validateEmployee}