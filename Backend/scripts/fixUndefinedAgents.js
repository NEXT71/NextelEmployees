import mongoose from 'mongoose';
import SalesTarget from '../models/SalesTarget.js';
import dotenv from 'dotenv';

dotenv.config();

const fixUndefinedAgents = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all sales with "undefined" in agentName
    const affectedSales = await SalesTarget.find({
      agentName: /undefined/i
    });

    console.log(`🔍 Found ${affectedSales.length} sales with undefined agentName`);

    if (affectedSales.length === 0) {
      console.log('✅ No sales need fixing');
      await mongoose.connection.close();
      return;
    }

    // Fix each one by using the customer name or a default
    for (const sale of affectedSales) {
      const newAgentName = sale.customer 
        ? `${sale.customer.firstName} ${sale.customer.lastName}`.trim()
        : 'Unknown';
      
      console.log(`📝 Fixing: ${sale._id} - Setting agentName to "${newAgentName}"`);
      
      await SalesTarget.findByIdAndUpdate(
        sale._id,
        { agentName: newAgentName }
      );
    }

    console.log(`✅ Fixed ${affectedSales.length} sales successfully`);
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

fixUndefinedAgents();
