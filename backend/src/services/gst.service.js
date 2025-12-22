import Decimal from 'decimal.js';
import GSTReturn from '../models/GSTReturn.js';
import Invoice from '../models/Invoice.js';
import CompanySettings from '../models/CompanySettings.js';
import logger from '../config/logger.js';

class GSTService {
  /**
   * Calculate GST components based on state
   */
  calculateGST(amount, gstRate, isInterstate = false) {
    const amt = new Decimal(amount);
    const rate = new Decimal(gstRate);
    
    const gstAmount = amt.times(rate).dividedBy(100);
    
    if (isInterstate) {
      // Interstate: IGST
      return {
        cgst: '0',
        sgst: '0',
        igst: gstAmount.toString(),
        total: gstAmount.toString(),
      };
    } else {
      // Intrastate: CGST + SGST (split equally)
      const halfGST = gstAmount.dividedBy(2);
      return {
        cgst: halfGST.toString(),
        sgst: halfGST.toString(),
        igst: '0',
        total: gstAmount.toString(),
      };
    }
  }
  
  /**
   * Generate GSTR1 (Outward Supplies)
   */
  async generateGSTR1(month, year) {
    try {
      const settings = await CompanySettings.findById('company_settings');
      
      if (!settings || !settings.gstin) {
        throw new Error('Company GSTIN not configured');
      }
      
      // Get date range for the month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      
      // Get all sent invoices for the period
      const invoices = await Invoice.find({
        status: { $in: ['sent', 'partial', 'paid'] },
        invoiceDate: { $gte: startDate, $lte: endDate },
      }).sort({ invoiceDate: 1 });
      
      const b2bInvoices = [];
      const b2cInvoices = [];
      
      let totalTaxable = new Decimal(0);
      let totalCGST = new Decimal(0);
      let totalSGST = new Decimal(0);
      let totalIGST = new Decimal(0);
      
      invoices.forEach(invoice => {
        const taxableValue = invoice.subtotal;
        const gstAmount = invoice.totalTax;
        
        // Determine if interstate based on customer GSTIN
        const companyState = settings.gstin.substring(0, 2);
        const customerState = invoice.customerGSTIN ? 
          invoice.customerGSTIN.substring(0, 2) : companyState;
        const isInterstate = companyState !== customerState;
        
        // Calculate GST components
        const gstRate = invoice.lines[0]?.taxRate || 18; // Assume first line rate
        const gst = this.calculateGST(taxableValue, gstRate, isInterstate);
        
        const invoiceData = {
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate,
          invoiceValue: invoice.totalAmount,
          taxableValue: invoice.subtotal,
          cgst: gst.cgst,
          sgst: gst.sgst,
          igst: gst.igst,
        };
        
        if (invoice.customerGSTIN) {
          // B2B
          b2bInvoices.push({
            ...invoiceData,
            customerGSTIN: invoice.customerGSTIN,
            customerName: invoice.customerName,
          });
        } else {
          // B2C
          b2cInvoices.push(invoiceData);
        }
        
        totalTaxable = totalTaxable.plus(taxableValue);
        totalCGST = totalCGST.plus(gst.cgst);
        totalSGST = totalSGST.plus(gst.sgst);
        totalIGST = totalIGST.plus(gst.igst);
      });
      
      // Create or update GSTR1
      const gstr1 = await GSTReturn.findOneAndUpdate(
        {
          returnType: 'GSTR1',
          'period.month': month,
          'period.year': year,
          gstin: settings.gstin,
        },
        {
          returnType: 'GSTR1',
          period: { month, year },
          gstin: settings.gstin,
          b2b: b2bInvoices,
          b2c: b2cInvoices,
          outwardSupplies: {
            taxable: totalTaxable.toString(),
            cgst: totalCGST.toString(),
            sgst: totalSGST.toString(),
            igst: totalIGST.toString(),
            cess: '0',
          },
          status: 'draft',
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );
      
      logger.info(`GSTR1 generated for ${month}/${year}`);
      
      return gstr1;
    } catch (error) {
      logger.error('Generate GSTR1 error:', error);
      throw error;
    }
  }
  
  /**
   * Generate GSTR3B (Summary Return)
   */
  async generateGSTR3B(month, year) {
    try {
      const settings = await CompanySettings.findById('company_settings');
      
      if (!settings || !settings.gstin) {
        throw new Error('Company GSTIN not configured');
      }
      
      // Get GSTR1 data first
      const gstr1 = await this.generateGSTR1(month, year);
      
      // For now, use outward supplies from GSTR1
      // In full implementation, would also calculate inward supplies and ITC
      
      const netTax = {
        cgst: gstr1.outwardSupplies.cgst,
        sgst: gstr1.outwardSupplies.sgst,
        igst: gstr1.outwardSupplies.igst,
        cess: '0',
        total: new Decimal(gstr1.outwardSupplies.cgst)
          .plus(gstr1.outwardSupplies.sgst)
          .plus(gstr1.outwardSupplies.igst)
          .toString(),
      };
      
      const gstr3b = await GSTReturn.findOneAndUpdate(
        {
          returnType: 'GSTR3B',
          'period.month': month,
          'period.year': year,
          gstin: settings.gstin,
        },
        {
          returnType: 'GSTR3B',
          period: { month, year },
          gstin: settings.gstin,
          outwardSupplies: gstr1.outwardSupplies,
          inwardSupplies: {
            taxable: '0',
            cgst: '0',
            sgst: '0',
            igst: '0',
            itc: '0',
          },
          netTaxLiability: netTax,
          status: 'draft',
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );
      
      logger.info(`GSTR3B generated for ${month}/${year}`);
      
      return gstr3b;
    } catch (error) {
      logger.error('Generate GSTR3B error:', error);
      throw error;
    }
  }
  
  /**
   * Get GST returns with filters
   */
  async getGSTReturns(filters = {}) {
    const { returnType, year, month, status } = filters;
    
    const query = {};
    
    if (returnType) {
      query.returnType = returnType;
    }
    
    if (year) {
      query['period.year'] = parseInt(year);
    }
    
    if (month) {
      query['period.month'] = parseInt(month);
    }
    
    if (status) {
      query.status = status;
    }
    
    const returns = await GSTReturn.find(query)
      .populate('filedBy', 'name email')
      .sort({ 'period.year': -1, 'period.month': -1 });
    
    return returns;
  }
  
  /**
   * File GST return
   */
  async fileGSTReturn(returnId, userId) {
    const gstReturn = await GSTReturn.findById(returnId);
    
    if (!gstReturn) {
      throw new Error('GST return not found');
    }
    
    if (gstReturn.status === 'filed') {
      throw new Error('Return is already filed');
    }
    
    gstReturn.status = 'filed';
    gstReturn.filedDate = new Date();
    gstReturn.filedBy = userId;
    
    await gstReturn.save();
    
    logger.info(`GST return filed: ${gstReturn.returnType} for ${gstReturn.period.month}/${gstReturn.period.year}`);
    
    return gstReturn;
  }
  
  /**
   * Validate GSTIN format
   */
  validateGSTIN(gstin) {
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstinRegex.test(gstin);
  }
  
  /**
   * Get HSN-wise summary
   */
  async getHSNSummary(month, year) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    // Aggregate invoices by HSN code
    // In full implementation, would need HSN code field in invoice lines
    
    return [];
  }
}

export default new GSTService();