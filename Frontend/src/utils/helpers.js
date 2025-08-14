export const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount);
};

export const calculateNetSalary = (baseSalary, fines = []) => {
  const totalFines = fines.reduce((sum, fine) => sum + fine.amount, 0);
  return baseSalary - totalFines;
};

export const generateEmployeeId = (department) => {
  const deptCode = department.substring(0, 3).toUpperCase();
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${deptCode}-${randomNum}`;
};