import PDFDocument from 'pdfkit';
import ledgerService from './ledger.service.js';
import Decimal from 'decimal.js';

class PDFService {
  /**
   * Generate General Ledger PDF
   */
  async generateGeneralLedger(filters = {}) {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Get data
    const { entries } = await ledgerService.getJournalEntries(filters, {
      page: 1,
      limit: 10000,
      sortBy: 'date',
      sortOrder: 'asc',
    });

    const summary = await ledgerService.getLedgerSummary();

    // Header
    doc.fontSize(20).text('General Ledger Report', { align: 'center' });
    doc.moveDown();

    // Date range
    doc.fontSize(10);
    if (filters.dateFrom || filters.dateTo) {
      const fromDate = filters.dateFrom
        ? new Date(filters.dateFrom).toLocaleDateString()
        : 'Beginning';
      const toDate = filters.dateTo
        ? new Date(filters.dateTo).toLocaleDateString()
        : 'Present';
      doc.text(`Period: ${fromDate} to ${toDate}`, { align: 'center' });
    }
    doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);

    // Summary section
    doc.fontSize(14).text('Financial Summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);

    const summaryData = [
      ['Total Assets:', this.formatCurrency(summary.assets)],
      ['Total Liabilities:', this.formatCurrency(summary.liabilities)],
      ['Total Equity:', this.formatCurrency(summary.equity)],
      ['Total Income:', this.formatCurrency(summary.income)],
      ['Total Expenses:', this.formatCurrency(summary.expenses)],
      ['Net Income:', this.formatCurrency(summary.netIncome)],
    ];

    summaryData.forEach(([label, value]) => {
      doc.text(label, 50, doc.y, { continued: true, width: 200 });
      doc.text(value, 300, doc.y, { align: 'right' });
      doc.moveDown(0.3);
    });

    doc.moveDown(1);

    // Check if accounting equation is balanced
    if (summary.isBalanced) {
      doc.fillColor('green').text('✓ Accounting equation balanced', { align: 'center' });
    } else {
      doc
        .fillColor('red')
        .text(
          `⚠ Accounting equation unbalanced (Difference: ${this.formatCurrency(
            summary.balanceDifference
          )})`,
          { align: 'center' }
        );
    }

    doc.fillColor('black');
    doc.moveDown(2);

    // Journal Entries section
    doc.fontSize(14).text('Journal Entries', { underline: true });
    doc.moveDown(1);

    if (entries.length === 0) {
      doc.fontSize(10).text('No entries found for the specified period.');
    } else {
      // Table headers
      doc.fontSize(9);
      const tableTop = doc.y;
      const col1 = 50;
      const col2 = 130;
      const col3 = 250;
      const col4 = 370;
      const col5 = 450;

      doc
        .text('Entry #', col1, tableTop, { width: 70 })
        .text('Date', col2, tableTop, { width: 110 })
        .text('Account', col3, tableTop, { width: 110 })
        .text('Debit', col4, tableTop, { width: 70, align: 'right' })
        .text('Credit', col5, tableTop, { width: 70, align: 'right' });

      doc
        .moveTo(col1, doc.y + 2)
        .lineTo(550, doc.y + 2)
        .stroke();

      doc.moveDown(0.5);

      // Entries
      let totalDebits = new Decimal(0);
      let totalCredits = new Decimal(0);

      entries.forEach((entry) => {
        const startY = doc.y;

        // Check if we need a new page
        if (doc.y > 700) {
          doc.addPage();
          doc.fontSize(9);
        }

        // Entry number and date
        doc.text(entry.entryNumber, col1, doc.y, { width: 70 });
        doc.text(new Date(entry.date).toLocaleDateString(), col2, startY, {
          width: 110,
        });

        // Lines
        let lineY = startY;
        entry.lines.forEach((line) => {
          const accountName = line.account.name || 'Unknown';
          const debit = line.debit !== '0' ? this.formatCurrency(line.debit) : '-';
          const credit = line.credit !== '0' ? this.formatCurrency(line.credit) : '-';

          doc.text(accountName, col3, lineY, { width: 110 });
          doc.text(debit, col4, lineY, { width: 70, align: 'right' });
          doc.text(credit, col5, lineY, { width: 70, align: 'right' });

          totalDebits = totalDebits.plus(new Decimal(line.debit || 0));
          totalCredits = totalCredits.plus(new Decimal(line.credit || 0));

          lineY += 15;
        });

        doc.y = lineY;

        // Description
        doc.fontSize(8).fillColor('gray');
        doc.text(`  ${entry.description}`, col1, doc.y, { width: 500 });
        doc.fontSize(9).fillColor('black');

        doc.moveDown(0.8);
      });

      // Totals
      doc
        .moveTo(col1, doc.y)
        .lineTo(550, doc.y)
        .stroke();

      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('TOTALS', col1, doc.y, { width: 290 });
      doc.text(this.formatCurrency(totalDebits.toString()), col4, doc.y, {
        width: 70,
        align: 'right',
      });
      doc.text(this.formatCurrency(totalCredits.toString()), col5, doc.y, {
        width: 70,
        align: 'right',
      });

      // Verify totals match
      if (totalDebits.equals(totalCredits)) {
        doc.moveDown(1);
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('green')
          .text('✓ Debits equal Credits', { align: 'center' });
      }
    }

    // Footer
    doc
      .fontSize(8)
      .fillColor('gray')
      .text(
        'ARTHA Finance v0.1 - Confidential',
        50,
        doc.page.height - 50,
        { align: 'center' }
      );

    doc.end();
    return doc;
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount) {
    const num = new Decimal(amount);
    return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
}

export default new PDFService();