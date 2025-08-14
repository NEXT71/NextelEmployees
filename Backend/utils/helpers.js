export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const isOTPExpired = (createdAt) => {
  const expirationTime = 60 * 60 * 1000; // 1 hour in milliseconds
  return Date.now() - new Date(createdAt).getTime() > expirationTime;
};