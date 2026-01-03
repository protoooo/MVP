import Stripe from 'stripe';
import { query } from '../config/database';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

export const invoiceService = {
  /**
   * Create a new invoice
   */
  async createInvoice(
    userId: number,
    customerId: number,
    items: Array<{ description: string; quantity: number; unitPrice: number }>,
    dueDate?: string,
    notes?: string
  ): Promise<any> {
    const client = await query('BEGIN');

    try {
      // Calculate totals
      let subtotal = 0;
      const processedItems = items.map((item) => {
        const amount = item.quantity * item.unitPrice;
        subtotal += amount;
        return {
          ...item,
          amount,
        };
      });

      const tax = 0; // Can be calculated based on customer location
      const total = subtotal + tax;

      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Create invoice
      const invoiceResult = await query(
        `INSERT INTO invoices (
          user_id, customer_id, invoice_number, status, 
          subtotal, tax, total, due_date, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [userId, customerId, invoiceNumber, 'draft', subtotal, tax, total, dueDate, notes]
      );

      const invoice = invoiceResult.rows[0];

      // Create invoice items
      for (const item of processedItems) {
        await query(
          `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount)
           VALUES ($1, $2, $3, $4, $5)`,
          [invoice.id, item.description, item.quantity, item.unitPrice, item.amount]
        );
      }

      await query('COMMIT');

      return {
        ...invoice,
        items: processedItems,
      };
    } catch (error: any) {
      await query('ROLLBACK');
      console.error('Error creating invoice:', error);
      throw new Error(`Failed to create invoice: ${error.message}`);
    }
  },

  /**
   * List invoices for a user
   */
  async listInvoices(
    userId: number,
    page: number = 1,
    limit: number = 20,
    status?: string
  ): Promise<any> {
    try {
      const offset = (page - 1) * limit;
      const statusFilter = status ? `AND i.status = $4` : '';
      const params: any[] = [userId, limit, offset];
      if (status) params.push(status);

      const results = await query(
        `SELECT 
          i.*,
          c.name as customer_name,
          c.email as customer_email,
          c.company as customer_company,
          (SELECT COUNT(*) FROM invoice_items WHERE invoice_id = i.id) as item_count
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        WHERE i.user_id = $1 ${statusFilter}
        ORDER BY i.created_at DESC
        LIMIT $2 OFFSET $3`,
        params
      );

      const countParams = status ? [userId, status] : [userId];
      const countResult = await query(
        `SELECT COUNT(*) as total FROM invoices WHERE user_id = $1 ${statusFilter}`,
        countParams
      );

      return {
        invoices: results.rows,
        total: parseInt(countResult.rows[0].total),
        page,
        limit,
        totalPages: Math.ceil(countResult.rows[0].total / limit),
      };
    } catch (error: any) {
      console.error('Error listing invoices:', error);
      throw new Error(`Failed to list invoices: ${error.message}`);
    }
  },

  /**
   * Get a single invoice with items
   */
  async getInvoice(userId: number, invoiceId: number): Promise<any> {
    try {
      const invoiceResult = await query(
        `SELECT 
          i.*,
          c.name as customer_name,
          c.email as customer_email,
          c.company as customer_company,
          c.phone as customer_phone,
          c.address_line1,
          c.address_line2,
          c.city,
          c.state,
          c.postal_code,
          c.country
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        WHERE i.id = $1 AND i.user_id = $2`,
        [invoiceId, userId]
      );

      if (invoiceResult.rows.length === 0) {
        throw new Error('Invoice not found');
      }

      const invoice = invoiceResult.rows[0];

      // Get invoice items
      const itemsResult = await query(
        `SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY id`,
        [invoiceId]
      );

      return {
        ...invoice,
        items: itemsResult.rows,
      };
    } catch (error: any) {
      console.error('Error getting invoice:', error);
      throw new Error(`Failed to get invoice: ${error.message}`);
    }
  },

  /**
   * Create Stripe payment intent for an invoice
   */
  async createPaymentIntent(userId: number, invoiceId: number): Promise<any> {
    try {
      // Get invoice
      const invoice = await this.getInvoice(userId, invoiceId);

      if (invoice.status === 'paid') {
        throw new Error('Invoice is already paid');
      }

      // Get or create Stripe customer
      let stripeCustomerId = invoice.stripe_customer_id;

      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: invoice.customer_email,
          name: invoice.customer_name,
          metadata: {
            customer_id: invoice.customer_id,
          },
        });
        stripeCustomerId = customer.id;

        // Update customer with Stripe ID
        await query(
          `UPDATE customers SET stripe_customer_id = $1 WHERE id = $2`,
          [stripeCustomerId, invoice.customer_id]
        );
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(invoice.total * 100), // Convert to cents
        currency: invoice.currency.toLowerCase(),
        customer: stripeCustomerId,
        metadata: {
          invoice_id: invoiceId.toString(),
          user_id: userId.toString(),
        },
      });

      // Create payment record
      await query(
        `INSERT INTO payments (
          user_id, invoice_id, stripe_payment_intent_id, 
          amount, currency, status
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, invoiceId, paymentIntent.id, invoice.total, invoice.currency, 'pending']
      );

      // Update invoice status to pending
      await query(
        `UPDATE invoices SET status = $1, updated_at = NOW() WHERE id = $2`,
        ['pending', invoiceId]
      );

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error: any) {
      console.error('Error creating payment intent:', error);
      throw new Error(`Failed to create payment intent: ${error.message}`);
    }
  },

  /**
   * Update invoice status (typically called by webhook)
   */
  async updateInvoiceStatus(invoiceId: number, status: string, paidAt?: Date): Promise<void> {
    try {
      await query(
        `UPDATE invoices 
         SET status = $1, paid_at = $2, updated_at = NOW() 
         WHERE id = $3`,
        [status, paidAt, invoiceId]
      );
    } catch (error: any) {
      console.error('Error updating invoice status:', error);
      throw new Error(`Failed to update invoice status: ${error.message}`);
    }
  },
};
