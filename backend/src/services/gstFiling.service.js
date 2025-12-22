import Invoice from '../models/Invoice.js';
import Expense from '../models/Expense.js';
import Decimal from 'decimal.js';
import logger from '../config/logger.js';
import fs from 'fs';

class GSTFilingService {
  /**
   * Generate GSTR-1 filing packet (Outward supplies)
   */
  async generateGSTR1FilingPacket(period) {
    try {
      const [year, month] = period.split('-');
      const startDate = new Date(`${year}-${month}-01`);
      const endDate = new Date(year, parseInt(month), 0);

      logger.info(`Generating GSTR-1 packet for ${period}`);

      const invoices = await Invoice.find({
        invoiceDate: { $gte: startDate, $lte: endDate },
        status: { $in: ['sent', 'partial', 'paid'] },
      }).lean();

      const supplies = {
        b2b: [],
        b2b_intrastate: [],
        b2c: [],
        export: [],
      };

      let totalTaxable = new Decimal(0);
      let totalCGST = new Decimal(0);
      let totalSGST = new Decimal(0);
      let totalIGST = new Decimal(0);

      for (const invoice of invoices) {
        const invoiceTotal = new Decimal(invoice.totalAmount || 0);
        const taxAmount = new Decimal(invoice.taxAmount || 0);
        const supplyType = this.determineSupplyType(invoice);

        const lineItem = {
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate.toISOString().split('T')[0],
          customerName: invoice.customerName,
          customerGSTIN: invoice.customerGSTIN || 'NOT-PROVIDED',
          description: invoice.lines
            .map((line) => line.description)
            .join(', ')
            .substring(0, 100),
          taxableAmount: invoiceTotal.minus(taxAmount).toString(),
          taxAmount: taxAmount.toString(),
          gstRate: invoice.taxRate || 18,
          totalAmount: invoiceTotal.toString(),
        };

        if (supplyType === 'b2b_intrastate') {
          const cgst = taxAmount.dividedBy(2);
          const sgst = taxAmount.minus(cgst);
          lineItem.cgst = cgst.toString();
          lineItem.sgst = sgst.toString();
          lineItem.igst = '0';
          totalCGST = totalCGST.plus(cgst);
          totalSGST = totalSGST.plus(sgst);
        } else {
          lineItem.cgst = '0';
          lineItem.sgst = '0';
          lineItem.igst = taxAmount.toString();
          totalIGST = totalIGST.plus(taxAmount);
        }

        supplies[supplyType].push(lineItem);
        totalTaxable = totalTaxable.plus(invoiceTotal.minus(taxAmount));
      }

      const packet = {
        period,
        filingType: 'GSTR-1',
        description: 'Outward Supplies Summary',
        generatedAt: new Date().toISOString(),
        supplies,
        summary: {
          totalInvoices: invoices.length,
          totalTaxableValue: totalTaxable.toString(),
          totalCGST: totalCGST.toString(),
          totalSGST: totalSGST.toString(),
          totalIGST: totalIGST.toString(),
          totalTaxCollected: totalCGST.plus(totalSGST).plus(totalIGST).toString(),
        },
      };

      logger.info(`GSTR-1 packet generated for ${period}`, {
        totalInvoices: invoices.length,
        totalTax: packet.summary.totalTaxCollected,
      });

      return packet;
    } catch (error) {
      logger.error('Generate GSTR-1 packet error:', error);
      throw error;
    }
  }

  /**
   * Generate GSTR-3B filing packet (Tax summary)
   */
  async generateGSTR3BFilingPacket(period) {
    try {
      const [year, month] = period.split('-');
      const startDate = new Date(`${year}-${month}-01`);
      const endDate = new Date(year, parseInt(month), 0);

      logger.info(`Generating GSTR-3B packet for ${period}`);

      const expenses = await Expense.find({
        date: { $gte: startDate, $lte: endDate },
        status: 'recorded',
      }).lean();

      const invoices = await Invoice.find({
        invoiceDate: { $gte: startDate, $lte: endDate },
        status: { $in: ['sent', 'partial', 'paid'] },
      }).lean();

      let outwardTaxable = new Decimal(0);
      let outwardCGST = new Decimal(0);
      let outwardSGST = new Decimal(0);
      let outwardIGST = new Decimal(0);

      let inwardTaxable = new Decimal(0);
      let inwardCGST = new Decimal(0);
      let inwardSGST = new Decimal(0);

      for (const invoice of invoices) {
        const taxAmount = new Decimal(invoice.taxAmount || 0);
        const taxableAmount = new Decimal(invoice.totalAmount || 0).minus(taxAmount);
        outwardTaxable = outwardTaxable.plus(taxableAmount);

        if (this.determineSupplyType(invoice) === 'b2b_intrastate') {
          const cgst = taxAmount.dividedBy(2);
          outwardCGST = outwardCGST.plus(cgst);
          outwardSGST = outwardSGST.plus(cgst);
        } else {
          outwardIGST = outwardIGST.plus(taxAmount);
        }
      }

      for (const expense of expenses) {
        const taxAmount = new Decimal(expense.taxAmount || 0);
        const taxableAmount = new Decimal(expense.amount || 0).minus(taxAmount);
        inwardTaxable = inwardTaxable.plus(taxableAmount);

        const cgst = taxAmount.dividedBy(2);
        inwardCGST = inwardCGST.plus(cgst);
        inwardSGST = inwardSGST.plus(cgst);
      }

      const netCGST = outwardCGST.minus(inwardCGST);
      const netSGST = outwardSGST.minus(inwardSGST);
      const netIGST = outwardIGST;
      const totalTaxPayable = netCGST.plus(netSGST).plus(netIGST);

      const packet = {
        period,
        filingType: 'GSTR-3B',
        description: 'Tax Summary and Reconciliation',
        generatedAt: new Date().toISOString(),
        outwardSupplies: {
          totalInvoices: invoices.length,
          taxableValue: outwardTaxable.toString(),
          cgst: outwardCGST.toString(),
          sgst: outwardSGST.toString(),
          igst: outwardIGST.toString(),
          totalTax: outwardCGST.plus(outwardSGST).plus(outwardIGST).toString(),
        },
        inwardSupplies: {
          totalExpenses: expenses.length,
          taxableValue: inwardTaxable.toString(),
          cgst: inwardCGST.toString(),
          sgst: inwardSGST.toString(),
          igst: '0.00',
          totalInputCredit: inwardCGST.plus(inwardSGST).toString(),
        },
        netLiability: {
          cgst: netCGST.toString(),
          sgst: netSGST.toString(),
          igst: netIGST.toString(),
          totalPayable: totalTaxPayable.toString(),
        },
      };

      logger.info(`GSTR-3B packet generated for ${period}`, {
        outwardTax: packet.outwardSupplies.totalTax,
        inputCredit: packet.inwardSupplies.totalInputCredit,
        netPayable: packet.netLiability.totalPayable,
      });

      return packet;
    } catch (error) {
      logger.error('Generate GSTR-3B packet error:', error);
      throw error;
    }
  }

  /**
   * Get GST summary for period
   */
  async getGSTSummary(period) {
    try {
      const gstr1 = await this.generateGSTR1FilingPacket(period);
      const gstr3b = await this.generateGSTR3BFilingPacket(period);

      return {
        period,
        generatedAt: new Date().toISOString(),
        gstr1Summary: gstr1.summary,
        gstr3bNetLiability: gstr3b.netLiability,
        combined: {
          totalOutwardTax: gstr1.summary.totalTaxCollected,
          totalInwardCredit: gstr3b.inwardSupplies.totalInputCredit,
          netTaxPayable: gstr3b.netLiability.totalPayable,
        },
      };
    } catch (error) {
      logger.error('Get GST summary error:', error);
      throw error;
    }
  }

  /**
   * Determine supply type
   */
  determineSupplyType(invoice) {
    if (invoice.isExport) return 'export';
    if (invoice.isConsumer) return 'b2c';
    return 'b2b_intrastate';
  }

  /**
   * Export filing packet as CSV
   */
  async exportFilingPacketAsCSV(packet, filePath) {
    try {
      const lines = [];

      lines.push('GST Filing Packet Export');
      lines.push(`Period: ${packet.period}`);
      lines.push(`Filing Type: ${packet.filingType}`);
      lines.push(`Generated: ${packet.generatedAt}`);
      lines.push('');

      if (packet.supplies) {
        lines.push('SUPPLIES SUMMARY');
        lines.push('Type,Count,TaxableValue,CGST,SGST,IGST,TotalTax');

        for (const [type, items] of Object.entries(packet.supplies)) {
          if (items.length > 0) {
            let typeValue = new Decimal(0);
            let typeCGST = new Decimal(0);
            let typeSGST = new Decimal(0);
            let typeIGST = new Decimal(0);

            items.forEach((item) => {
              typeValue = typeValue.plus(item.taxableAmount || 0);
              typeCGST = typeCGST.plus(item.cgst || 0);
              typeSGST = typeSGST.plus(item.sgst || 0);
              typeIGST = typeIGST.plus(item.igst || 0);
            });

            const typeTax = typeCGST.plus(typeSGST).plus(typeIGST);
            lines.push(`${type},${items.length},${typeValue},${typeCGST},${typeSGST},${typeIGST},${typeTax}`);
          }
        }
      }

      if (packet.summary) {
        lines.push('');
        lines.push('FILING SUMMARY');
        lines.push(`Total Taxable Value,${packet.summary.totalTaxableValue}`);
        lines.push(`CGST,${packet.summary.totalCGST}`);
        lines.push(`SGST,${packet.summary.totalSGST}`);
        lines.push(`IGST,${packet.summary.totalIGST}`);
        lines.push(`Total Tax,${packet.summary.totalTaxCollected}`);
      }

      fs.writeFileSync(filePath, lines.join('\n'));
      logger.info(`Filing packet exported to ${filePath}`);

      return filePath;
    } catch (error) {
      logger.error('Export filing packet error:', error);
      throw error;
    }
  }
}

export default new GSTFilingService();
