import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const config = {
  // Email Configuration
  EMAIL_USERNAME: process.env.EMAIL_USERNAME || '',
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD || '',
  EMAIL_FROM: process.env.EMAIL_FROM || process.env.EMAIL_USERNAME,
  
  // Client Configuration
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  
  // Server Configuration
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database Configuration (if needed)
  DATABASE_URL: process.env.DATABASE_URL || '',
  MONGODB_URI: process.env.MONGODB_URI || '',
  
  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  
  // Security Configuration
  BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12,
  
  // Token Expiration Times
  OTP_EXPIRE_TIME: process.env.OTP_EXPIRE_TIME || '1h', // 1 hour
  PASSWORD_RESET_EXPIRE_TIME: process.env.PASSWORD_RESET_EXPIRE_TIME || '10m', // 10 minutes
  
  // Rate Limiting
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
};

// Validation function to check required environment variables
export const validateConfig = () => {
  const requiredVars = [
    'EMAIL_USERNAME',
    'EMAIL_PASSWORD',
    'JWT_SECRET',
    'MONGO_URI'
  ];
  
  const missingVars = requiredVars.filter(varName => !config[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
      'Please check your .env file and ensure all required variables are set.'
    );
  }
};

export default config;