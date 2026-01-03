import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { invoiceService } from '../services/invoiceService';

const router = express.Router();

/**
 * POST /api/invoices
 * Create a new invoice
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { customerId, items, dueDate, notes } = req.body;

    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Customer ID and items are required' });
    }

    const invoice = await invoiceService.createInvoice(
      userId,
      customerId,
      items,
      dueDate,
      notes
    );

    res.status(201).json(invoice);
  } catch (error: any) {
    console.error('Error in POST /api/invoices:', error);
    res.status(500).json({ error: error.message || 'Failed to create invoice' });
  }
});

/**
 * GET /api/invoices
 * List invoices
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;

    const invoices = await invoiceService.listInvoices(userId, page, limit, status);

    res.json(invoices);
  } catch (error: any) {
    console.error('Error in GET /api/invoices:', error);
    res.status(500).json({ error: error.message || 'Failed to list invoices' });
  }
});

/**
 * GET /api/invoices/:id
 * Get a specific invoice
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const invoiceId = parseInt(req.params.id);
    if (isNaN(invoiceId)) {
      return res.status(400).json({ error: 'Invalid invoice ID' });
    }

    const invoice = await invoiceService.getInvoice(userId, invoiceId);

    res.json(invoice);
  } catch (error: any) {
    console.error('Error in GET /api/invoices/:id:', error);
    res.status(500).json({ error: error.message || 'Failed to get invoice' });
  }
});

/**
 * POST /api/invoices/:id/payment-intent
 * Create a Stripe payment intent for an invoice
 */
router.post('/:id/payment-intent', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const invoiceId = parseInt(req.params.id);
    if (isNaN(invoiceId)) {
      return res.status(400).json({ error: 'Invalid invoice ID' });
    }

    const result = await invoiceService.createPaymentIntent(userId, invoiceId);

    res.json(result);
  } catch (error: any) {
    console.error('Error in POST /api/invoices/:id/payment-intent:', error);
    res.status(500).json({ error: error.message || 'Failed to create payment intent' });
  }
});

export default router;
