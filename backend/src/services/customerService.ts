import { query } from '../config/database';

export const customerService = {
  /**
   * Create a new customer
   */
  async createCustomer(
    userId: number,
    data: {
      email: string;
      name: string;
      company?: string;
      phone?: string;
      address?: {
        line1?: string;
        line2?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
      };
    }
  ): Promise<any> {
    try {
      const result = await query(
        `INSERT INTO customers (
          user_id, email, name, company, phone,
          address_line1, address_line2, city, state, postal_code, country
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          userId,
          data.email,
          data.name,
          data.company,
          data.phone,
          data.address?.line1,
          data.address?.line2,
          data.address?.city,
          data.address?.state,
          data.address?.postalCode,
          data.address?.country,
        ]
      );

      return result.rows[0];
    } catch (error: any) {
      console.error('Error creating customer:', error);
      throw new Error(`Failed to create customer: ${error.message}`);
    }
  },

  /**
   * List customers for a user
   */
  async listCustomers(
    userId: number,
    page: number = 1,
    limit: number = 20
  ): Promise<any> {
    try {
      const offset = (page - 1) * limit;

      const results = await query(
        `SELECT 
          c.*,
          COUNT(DISTINCT i.id) as invoice_count,
          COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.total ELSE 0 END), 0) as total_revenue,
          COUNT(DISTINCT ci.id) as interaction_count
        FROM customers c
        LEFT JOIN invoices i ON c.id = i.customer_id
        LEFT JOIN customer_interactions ci ON c.id = ci.customer_id
        WHERE c.user_id = $1
        GROUP BY c.id
        ORDER BY c.created_at DESC
        LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      const countResult = await query(
        `SELECT COUNT(*) as total FROM customers WHERE user_id = $1`,
        [userId]
      );

      return {
        customers: results.rows,
        total: parseInt(countResult.rows[0].total),
        page,
        limit,
        totalPages: Math.ceil(countResult.rows[0].total / limit),
      };
    } catch (error: any) {
      console.error('Error listing customers:', error);
      throw new Error(`Failed to list customers: ${error.message}`);
    }
  },

  /**
   * Get a single customer with related data
   */
  async getCustomer(userId: number, customerId: number): Promise<any> {
    try {
      // Get customer details
      const customerResult = await query(
        `SELECT c.*
        FROM customers c
        WHERE c.id = $1 AND c.user_id = $2`,
        [customerId, userId]
      );

      if (customerResult.rows.length === 0) {
        throw new Error('Customer not found');
      }

      const customer = customerResult.rows[0];

      // Get related invoices
      const invoicesResult = await query(
        `SELECT * FROM invoices 
         WHERE customer_id = $1 
         ORDER BY created_at DESC 
         LIMIT 10`,
        [customerId]
      );

      // Get related emails (by matching email address)
      const emailsResult = await query(
        `SELECT id, from_email, subject, body_text, received_at, is_read
         FROM emails
         WHERE user_id = $1 
         AND ($2 = ANY(to_emails) OR from_email = $2)
         ORDER BY received_at DESC
         LIMIT 10`,
        [userId, customer.email]
      );

      // Get customer interactions
      const interactionsResult = await query(
        `SELECT * FROM customer_interactions
         WHERE customer_id = $1
         ORDER BY interaction_date DESC
         LIMIT 10`,
        [customerId]
      );

      return {
        ...customer,
        invoices: invoicesResult.rows,
        emails: emailsResult.rows,
        interactions: interactionsResult.rows,
        stats: {
          totalInvoices: invoicesResult.rows.length,
          totalRevenue: invoicesResult.rows
            .filter((inv) => inv.status === 'paid')
            .reduce((sum, inv) => sum + parseFloat(inv.total), 0),
        },
      };
    } catch (error: any) {
      console.error('Error getting customer:', error);
      throw new Error(`Failed to get customer: ${error.message}`);
    }
  },

  /**
   * Update a customer
   */
  async updateCustomer(
    userId: number,
    customerId: number,
    data: Partial<{
      email: string;
      name: string;
      company: string;
      phone: string;
      address: {
        line1?: string;
        line2?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
      };
    }>
  ): Promise<any> {
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (data.email !== undefined) {
        updates.push(`email = $${paramIndex++}`);
        values.push(data.email);
      }
      if (data.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(data.name);
      }
      if (data.company !== undefined) {
        updates.push(`company = $${paramIndex++}`);
        values.push(data.company);
      }
      if (data.phone !== undefined) {
        updates.push(`phone = $${paramIndex++}`);
        values.push(data.phone);
      }
      if (data.address) {
        if (data.address.line1 !== undefined) {
          updates.push(`address_line1 = $${paramIndex++}`);
          values.push(data.address.line1);
        }
        if (data.address.line2 !== undefined) {
          updates.push(`address_line2 = $${paramIndex++}`);
          values.push(data.address.line2);
        }
        if (data.address.city !== undefined) {
          updates.push(`city = $${paramIndex++}`);
          values.push(data.address.city);
        }
        if (data.address.state !== undefined) {
          updates.push(`state = $${paramIndex++}`);
          values.push(data.address.state);
        }
        if (data.address.postalCode !== undefined) {
          updates.push(`postal_code = $${paramIndex++}`);
          values.push(data.address.postalCode);
        }
        if (data.address.country !== undefined) {
          updates.push(`country = $${paramIndex++}`);
          values.push(data.address.country);
        }
      }

      if (updates.length === 0) {
        throw new Error('No fields to update');
      }

      updates.push(`updated_at = NOW()`);
      values.push(customerId, userId);

      const result = await query(
        `UPDATE customers 
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error('Customer not found');
      }

      return result.rows[0];
    } catch (error: any) {
      console.error('Error updating customer:', error);
      throw new Error(`Failed to update customer: ${error.message}`);
    }
  },

  /**
   * Add customer interaction
   */
  async addInteraction(
    userId: number,
    customerId: number,
    type: string,
    subject: string,
    description?: string
  ): Promise<any> {
    try {
      const result = await query(
        `INSERT INTO customer_interactions (
          user_id, customer_id, interaction_type, subject, description
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [userId, customerId, type, subject, description]
      );

      return result.rows[0];
    } catch (error: any) {
      console.error('Error adding interaction:', error);
      throw new Error(`Failed to add interaction: ${error.message}`);
    }
  },
};
