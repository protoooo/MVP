import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { customerService } from '../services/customerService';

const router = express.Router();

/**
 * POST /api/customers
 * Create a new customer
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { email, name, company, phone, address } = req.body;

    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required' });
    }

    const customer = await customerService.createCustomer(userId, {
      email,
      name,
      company,
      phone,
      address,
    });

    res.status(201).json(customer);
  } catch (error: any) {
    console.error('Error in POST /api/customers:', error);
    res.status(500).json({ error: error.message || 'Failed to create customer' });
  }
});

/**
 * GET /api/customers
 * List customers
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const customers = await customerService.listCustomers(userId, page, limit);

    res.json(customers);
  } catch (error: any) {
    console.error('Error in GET /api/customers:', error);
    res.status(500).json({ error: error.message || 'Failed to list customers' });
  }
});

/**
 * GET /api/customers/:id
 * Get a specific customer with related data
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const customerId = parseInt(req.params.id);
    if (isNaN(customerId)) {
      return res.status(400).json({ error: 'Invalid customer ID' });
    }

    const customer = await customerService.getCustomer(userId, customerId);

    res.json(customer);
  } catch (error: any) {
    console.error('Error in GET /api/customers/:id:', error);
    res.status(500).json({ error: error.message || 'Failed to get customer' });
  }
});

/**
 * PUT /api/customers/:id
 * Update a customer
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const customerId = parseInt(req.params.id);
    if (isNaN(customerId)) {
      return res.status(400).json({ error: 'Invalid customer ID' });
    }

    const customer = await customerService.updateCustomer(userId, customerId, req.body);

    res.json(customer);
  } catch (error: any) {
    console.error('Error in PUT /api/customers/:id:', error);
    res.status(500).json({ error: error.message || 'Failed to update customer' });
  }
});

/**
 * POST /api/customers/:id/interactions
 * Add a customer interaction
 */
router.post('/:id/interactions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const customerId = parseInt(req.params.id);
    if (isNaN(customerId)) {
      return res.status(400).json({ error: 'Invalid customer ID' });
    }

    const { type, subject, description } = req.body;

    if (!type || !subject) {
      return res.status(400).json({ error: 'Type and subject are required' });
    }

    const interaction = await customerService.addInteraction(
      userId,
      customerId,
      type,
      subject,
      description
    );

    res.status(201).json(interaction);
  } catch (error: any) {
    console.error('Error in POST /api/customers/:id/interactions:', error);
    res.status(500).json({ error: error.message || 'Failed to add interaction' });
  }
});

export default router;
