import invoiceService from '../services/invoice.service.js';
import logger from '../config/logger.js';

// @desc    Create invoice
// @route   POST /api/v1/invoices
// @access  Private (accountant, admin)
export const createInvoice = async (req, res) => {
  try {
    // Map lines to items for backward compatibility
    if (req.body.lines && !req.body.items) {
      req.body.items = req.body.lines;
    }
    
    const invoice = await invoiceService.createInvoice(req.body, req.user._id);
    
    res.status(201).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    logger.error('Create invoice error:', error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get invoices
// @route   GET /api/v1/invoices
// @access  Private
export const getInvoices = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      customerName: req.query.customerName,
      search: req.query.search,
    };
    
    const pagination = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      sortBy: req.query.sortBy || 'invoiceDate',
      sortOrder: req.query.sortOrder || 'desc',
    };
    
    const result = await invoiceService.getInvoices(filters, pagination);
    
    res.json({
      success: true,
      data: result.invoices,
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error('Get invoices error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single invoice
// @route   GET /api/v1/invoices/:id
// @access  Private
export const getInvoice = async (req, res) => {
  try {
    const invoice = await invoiceService.getInvoiceById(req.params.id);
    
    res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    logger.error('Get invoice error:', error);
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update invoice
// @route   PUT /api/v1/invoices/:id
// @access  Private (accountant, admin)
export const updateInvoice = async (req, res) => {
  try {
    const invoice = await invoiceService.updateInvoice(req.params.id, req.body);
    
    res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    logger.error('Update invoice error:', error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Send invoice
// @route   POST /api/v1/invoices/:id/send
// @access  Private (accountant, admin)
export const sendInvoice = async (req, res) => {
  try {
    const invoice = await invoiceService.sendInvoice(req.params.id, req.user._id);
    
    res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    logger.error('Send invoice error:', error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Record payment
// @route   POST /api/v1/invoices/:id/payment
// @access  Private (accountant, admin)
export const recordPayment = async (req, res) => {
  try {
    const invoice = await invoiceService.recordPayment(
      req.params.id,
      req.body,
      req.user._id
    );
    
    res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    logger.error('Record payment error:', error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Cancel invoice
// @route   POST /api/v1/invoices/:id/cancel
// @access  Private (accountant, admin)
export const cancelInvoice = async (req, res) => {
  try {
    const { reason } = req.body;
    
    // Use default reason if not provided
    const cancellationReason = reason || 'Cancelled by user';
    
    const invoice = await invoiceService.cancelInvoice(
      req.params.id,
      cancellationReason,
      req.user._id
    );
    
    res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    logger.error('Cancel invoice error:', error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get invoice stats
// @route   GET /api/v1/invoices/stats
// @access  Private
export const getInvoiceStats = async (req, res) => {
  try {
    const stats = await invoiceService.getInvoiceStats(
      req.query.dateFrom,
      req.query.dateTo
    );
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Get invoice stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};