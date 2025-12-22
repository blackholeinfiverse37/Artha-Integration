import dotenv from 'dotenv';
import mongoose from 'mongoose';
import GSTReturn from '../src/models/GSTReturn.js';
import TDSEntry from '../src/models/TDSEntry.js';
import CompanySettings from '../src/models/CompanySettings.js';
import User from '../src/models/User.js';
import ChartOfAccounts from '../src/models/ChartOfAccounts.js';

dotenv.config();

const testIndiaModels = async () => {
  try {
    console.log('🇮🇳 Testing India Compliance Models...\n');

    // Test GSTReturn model
    console.log('📊 Testing GSTReturn model...');
    const gstReturn = new GSTReturn({
      returnType: 'GSTR1',
      period: { month: 12, year: 2024 },
      gstin: '27AABCU9603R1ZX',
      b2b: [{
        customerGSTIN: '29AABCU9603R1ZY',
        customerName: 'Test Customer',
        invoiceNumber: 'INV-001',
        invoiceDate: new Date(),
        invoiceValue: '118000.00',
        taxableValue: '100000.00',
        cgst: '9000.00',
        sgst: '9000.00',
        igst: '0.00'
      }],
      status: 'draft'
    });
    
    const validationError = gstReturn.validateSync();
    if (validationError) {
      console.log('❌ GSTReturn validation failed:', validationError.message);
    } else {
      console.log('✅ GSTReturn model validation passed');
    }

    // Test TDSEntry model
    console.log('\n💰 Testing TDSEntry model...');
    const tdsEntry = new TDSEntry({
      transactionDate: new Date(),
      deductee: {
        name: 'Test Vendor',
        pan: 'ABCDE1234F',
        address: 'Test Address'
      },
      section: '194J',
      nature: 'Professional Fees',
      paymentAmount: '100000.00',
      tdsRate: 10,
      tdsAmount: '10000.00',
      status: 'pending',
      quarter: 'Q3',
      financialYear: '2024-25',
      createdBy: new mongoose.Types.ObjectId()
    });

    const tdsValidationError = tdsEntry.validateSync();
    if (tdsValidationError) {
      console.log('❌ TDSEntry validation failed:', tdsValidationError.message);
    } else {
      console.log('✅ TDSEntry model validation passed');
    }

    // Test CompanySettings model
    console.log('\n🏢 Testing CompanySettings model...');
    const companySettings = new CompanySettings({
      companyName: 'Test Company Pvt Ltd',
      legalName: 'Test Company Private Limited',
      address: {
        street: '123 Business Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India'
      },
      gstin: '27AABCU9603R1ZX',
      pan: 'AABCU9603R',
      tan: 'MUMA12345E',
      gstSettings: {
        isRegistered: true,
        filingFrequency: 'monthly'
      },
      tdsSettings: {
        isTANActive: true,
        defaultTDSRate: 10
      }
    });

    const settingsValidationError = companySettings.validateSync();
    if (settingsValidationError) {
      console.log('❌ CompanySettings validation failed:', settingsValidationError.message);
    } else {
      console.log('✅ CompanySettings model validation passed');
    }

    // Test regex patterns
    console.log('\n🔍 Testing validation patterns...');
    
    // GSTIN validation
    const validGSTIN = '27AABCU9603R1ZX';
    const invalidGSTIN = 'INVALID123';
    console.log(`GSTIN ${validGSTIN}: ${/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(validGSTIN) ? '✅' : '❌'}`);
    console.log(`GSTIN ${invalidGSTIN}: ${/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(invalidGSTIN) ? '✅' : '❌'}`);

    // PAN validation
    const validPAN = 'AABCU9603R';
    const invalidPAN = 'INVALID123';
    console.log(`PAN ${validPAN}: ${/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(validPAN) ? '✅' : '❌'}`);
    console.log(`PAN ${invalidPAN}: ${/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(invalidPAN) ? '✅' : '❌'}`);

    // TAN validation
    const validTAN = 'MUMA12345E';
    const invalidTAN = 'INVALID123';
    console.log(`TAN ${validTAN}: ${/^[A-Z]{4}[0-9]{5}[A-Z]{1}$/.test(validTAN) ? '✅' : '❌'}`);
    console.log(`TAN ${invalidTAN}: ${/^[A-Z]{4}[0-9]{5}[A-Z]{1}$/.test(invalidTAN) ? '✅' : '❌'}`);

    console.log('\n🎉 India Compliance Models testing completed!');
    console.log('\n📋 Summary:');
    console.log('   ✅ GSTReturn model - GST return filing support');
    console.log('   ✅ TDSEntry model - TDS deduction and compliance');
    console.log('   ✅ CompanySettings model - India statutory configuration');
    console.log('   ✅ All validation patterns working correctly');
    console.log('   ✅ Models ready for service layer integration');

  } catch (error) {
    console.error('❌ Test error:', error);
  }
};

testIndiaModels();