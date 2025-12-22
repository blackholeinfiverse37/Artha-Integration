import mongoose from 'mongoose';
import Expense from '../src/models/Expense.js';
import Invoice from '../src/models/Invoice.js';
import User from '../src/models/User.js';
import ChartOfAccounts from '../src/models/ChartOfAccounts.js';
import dotenv from 'dotenv';

dotenv.config();

async function cleanupTestData() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Database connected');

    // Clean up test data
    const expenseResult = await Expense.deleteMany({ vendor: /Test/ });
    console.log(`🧹 Cleaned up ${expenseResult.deletedCount} test expenses`);

    const invoiceResult = await Invoice.deleteMany({ customerName: /Test/ });
    console.log(`🧹 Cleaned up ${invoiceResult.deletedCount} test invoices`);

    const userResult = await User.deleteMany({ email: /test.*\.(local|expense|invoice)/ });
    console.log(`🧹 Cleaned up ${userResult.deletedCount} test users`);

    const accountResult = await ChartOfAccounts.deleteMany({ code: /TEST/ });
    console.log(`🧹 Cleaned up ${accountResult.deletedCount} test accounts`);

    console.log('\n✅ All test data cleaned up successfully!');

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

cleanupTestData();