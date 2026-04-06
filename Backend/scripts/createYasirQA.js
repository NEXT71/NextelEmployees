import mongoose from 'mongoose';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const createQAUser = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Remove existing user with same email
    await User.deleteOne({ email: 'yasir@gmail.com' });

    const qaUser = new User({
      username: 'yasir',
      email: 'yasir@gmail.com',
      password: 'yasir123',
      role: 'qa',
      isActive: true,
      verified: true,
      firstName: 'Yasir',
      lastName: '',
    });

    await qaUser.save();

    console.log('✅ QA user created!');
    console.log('📧 Email:    yasir@gmail.com');
    console.log('🔑 Password: yasir123');
    console.log('👤 Username: yasir');
    console.log('🎭 Role:     qa');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

createQAUser();
