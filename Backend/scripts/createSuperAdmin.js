/**
 * createSuperAdmin.js
 * 
 * Run this script once to create the Super Admin account.
 * Usage:
 *   node scripts/createSuperAdmin.js
 * 
 * Or with custom credentials via env:
 *   SA_USERNAME=myuser SA_EMAIL=me@company.com SA_PASSWORD=SecurePass1 node scripts/createSuperAdmin.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../.env') });

// Inline schema to avoid circular dependency issues when running standalone
import User from '../models/User.js';

const SA_USERNAME = process.env.SA_USERNAME || 'MaazAbbasi';
const SA_EMAIL    = process.env.SA_EMAIL    || 'maaz@nextelbpo.co';
const SA_PASSWORD = process.env.SA_PASSWORD || 'Nextel@786';

async function createSuperAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const existing = await User.findOne({ $or: [{ email: SA_EMAIL }, { username: SA_USERNAME }] });
    if (existing) {
      if (existing.role === 'superadmin') {
        console.log(`ℹ️  Super Admin already exists: ${existing.username} (${existing.email})`);
      } else {
        // Upgrade existing account to superadmin
        existing.role = 'superadmin';
        existing.isActive = true;
        await existing.save();
        console.log(`✅ Upgraded existing user to superadmin: ${existing.username}`);
      }
      process.exit(0);
    }

    const superAdmin = await User.create({
      username: SA_USERNAME,
      email: SA_EMAIL,
      password: SA_PASSWORD,
      role: 'superadmin',
      isActive: true
    });

    console.log('✅ Super Admin created successfully!');
    console.log('─────────────────────────────────');
    console.log(`  Username : ${superAdmin.username}`);
    console.log(`  Email    : ${superAdmin.email}`);
    console.log(`  Password : ${SA_PASSWORD}  ← change this after first login`);
    console.log('─────────────────────────────────');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating super admin:', err.message);
    process.exit(1);
  }
}

createSuperAdmin();
