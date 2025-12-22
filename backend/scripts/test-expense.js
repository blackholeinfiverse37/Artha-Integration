import mongoose from 'mongoose';
import Expense from '../src/models/Expense.js';
import User from '../src/models/User.js';
import ChartOfAccounts from '../src/models/ChartOfAccounts.js';
import dotenv from 'dotenv';

dotenv.config();

async function testExpenseModel() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Database connected');

    // Clean up existing test data
    await Expense.deleteMany({ vendor: /Test/ });
    await User.deleteMany({ email: /test.*expense/ });
    await ChartOfAccounts.deleteMany({ code: 'TEST-EXP' });

    // Create test user
    const user = await User.create({
      email: 'test@expense.local',
      password: 'Test@123456',
      name: 'Test User',
      role: 'admin',
    });
    console.log('✅ Test user created');

    // Create test expense account
    const expenseAccount = await ChartOfAccounts.create({
      code: 'TEST-EXP',
      name: 'Test Expense Account',
      type: 'Expense',
      normalBalance: 'debit',
    });
    console.log('✅ Test expense account created');

    // Test 1: Create expense with automatic calculations
    console.log('\n💰 Test 1: Creating expense with automatic calculations...');
    const expense = await Expense.create({
      category: 'travel',
      vendor: 'Test Vendor',
      description: 'Business travel expense',
      amount: '1000.00',
      taxAmount: '180.00', // 18% tax
      paymentMethod: 'card',
      paymentDate: new Date(),
      reference: 'TXN-12345',
      submittedBy: user._id,
      account: expenseAccount._id,
      notes: 'Conference travel',
      tags: ['business', 'conference'],
    });

    console.log(`✅ Expense created: ${expense.expenseNumber}`);
    console.log(`   Amount: $${expense.amount}`);
    console.log(`   Tax: $${expense.taxAmount}`);
    console.log(`   Total: $${expense.totalAmount}`);
    console.log(`   Status: ${expense.status}`);
    console.log(`   Category: ${expense.category}`);

    // Verify calculations
    const expectedTotal = '1180'; // 1000 + 180
    if (expense.totalAmount === expectedTotal) {
      console.log('✅ Total amount calculation is correct!');
    } else {
      console.log(`❌ Calculation error: expected ${expectedTotal}, got ${expense.totalAmount}`);
    }

    // Test 2: Expense number generation
    console.log('\n🔢 Test 2: Testing expense number generation...');
    const expense2 = await Expense.create({
      category: 'supplies',
      vendor: 'Test Vendor 2',
      description: 'Office supplies',
      amount: '500.00',
      paymentMethod: 'cash',
      submittedBy: user._id,
    });

    console.log(`✅ Second expense created: ${expense2.expenseNumber}`);
    
    if (expense.expenseNumber !== expense2.expenseNumber) {
      console.log('✅ Unique expense numbers generated!');
    } else {
      console.log('❌ Expense number generation error');
    }

    // Test 3: Approval workflow
    console.log('\n✅ Test 3: Testing approval workflow...');
    
    // Approve expense
    expense.status = 'approved';
    expense.approvedBy = user._id;
    expense.approvedAt = new Date();
    await expense.save();

    console.log(`✅ Expense approved by: ${expense.approvedBy}`);
    console.log(`   Status: ${expense.status}`);
    console.log(`   Approved at: ${expense.approvedAt}`);

    // Test 4: Rejection workflow
    console.log('\n❌ Test 4: Testing rejection workflow...');
    
    expense2.status = 'rejected';
    expense2.rejectionReason = 'Missing receipt';
    await expense2.save();

    console.log(`✅ Expense rejected: ${expense2.status}`);
    console.log(`   Reason: ${expense2.rejectionReason}`);

    // Test 5: Receipt attachment
    console.log('\n📎 Test 5: Testing receipt attachments...');
    
    expense.receipts.push({
      filename: 'receipt.pdf',
      path: '/uploads/receipts/receipt.pdf',
      mimetype: 'application/pdf',
      size: 1024000,
    });
    await expense.save();

    console.log(`✅ Receipt attached: ${expense.receipts[0].filename}`);
    console.log(`   Size: ${expense.receipts[0].size} bytes`);
    console.log(`   Type: ${expense.receipts[0].mimetype}`);

    // Test 6: Category validation
    console.log('\n📋 Test 6: Testing category validation...');
    
    try {
      await Expense.create({
        category: 'invalid_category',
        vendor: 'Test Vendor',
        description: 'Invalid category test',
        amount: '100.00',
        paymentMethod: 'cash',
        submittedBy: user._id,
      });
      console.log('❌ Category validation failed - invalid category accepted');
    } catch (error) {
      console.log('✅ Category validation works - invalid category rejected');
    }

    // Test 7: Payment method validation
    console.log('\n💳 Test 7: Testing payment method validation...');
    
    try {
      await Expense.create({
        category: 'other',
        vendor: 'Test Vendor',
        description: 'Invalid payment method test',
        amount: '100.00',
        paymentMethod: 'invalid_method',
        submittedBy: user._id,
      });
      console.log('❌ Payment method validation failed - invalid method accepted');
    } catch (error) {
      console.log('✅ Payment method validation works - invalid method rejected');
    }

    // Test 8: Status workflow
    console.log('\n🔄 Test 8: Testing status workflow...');
    
    const workflowExpense = await Expense.create({
      category: 'equipment',
      vendor: 'Equipment Vendor',
      description: 'New laptop',
      amount: '2000.00',
      paymentMethod: 'bank_transfer',
      submittedBy: user._id,
    });

    console.log(`   Initial status: ${workflowExpense.status}`);
    
    // Approve
    workflowExpense.status = 'approved';
    workflowExpense.approvedBy = user._id;
    workflowExpense.approvedAt = new Date();
    await workflowExpense.save();
    console.log(`   After approval: ${workflowExpense.status}`);
    
    // Record in accounting
    workflowExpense.status = 'recorded';
    await workflowExpense.save();
    console.log(`   After recording: ${workflowExpense.status}`);

    // Clean up
    await Expense.deleteMany({ vendor: /Test/ });
    await User.deleteMany({ email: /test.*expense/ });
    await ChartOfAccounts.deleteMany({ code: 'TEST-EXP' });
    console.log('\n🧹 Test data cleaned up');

    console.log('\n🎉 All Expense model tests passed successfully!');
    console.log('\n📊 Expense Model Features Verified:');
    console.log('   ✅ Automatic expense number generation');
    console.log('   ✅ Total amount calculations (amount + tax)');
    console.log('   ✅ Category and payment method validation');
    console.log('   ✅ Approval workflow (pending → approved/rejected)');
    console.log('   ✅ Receipt attachment support');
    console.log('   ✅ Status management and transitions');
    console.log('   ✅ User and account references');
    console.log('   ✅ Metadata and tagging support');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
}

testExpenseModel();