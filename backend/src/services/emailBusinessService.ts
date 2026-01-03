import { Resend } from 'resend';
import { query } from '../config/database';
import { cohereService } from './cohereService';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'ProtocolLM <noreply@protocollm.org>';

export const emailBusinessService = {
  /**
   * Send an email via Resend and store it in the database with embedding
   */
  async sendEmail(
    userId: number,
    to: string[],
    subject: string,
    bodyText: string,
    bodyHtml?: string,
    cc?: string[],
    bcc?: string[],
    fromEmail?: string
  ): Promise<any> {
    try {
      // Send email via Resend
      const emailData = await resend.emails.send({
        from: fromEmail || FROM_EMAIL,
        to,
        cc,
        bcc,
        subject,
        text: bodyText,
        html: bodyHtml || bodyText.replace(/\n/g, '<br>'),
      });

      // Generate embedding for the email body
      const embedding = await cohereService.generateEmbedding(
        `${subject}\n\n${bodyText}`
      );

      // Find or create thread based on subject
      let threadId;
      const threadResult = await query(
        `SELECT id FROM email_threads 
         WHERE user_id = $1 AND subject = $2
         ORDER BY created_at DESC LIMIT 1`,
        [userId, subject]
      );

      if (threadResult.rows.length > 0) {
        threadId = threadResult.rows[0].id;
        // Update last_message_at
        await query(
          `UPDATE email_threads SET last_message_at = NOW() WHERE id = $1`,
          [threadId]
        );
      } else {
        // Create new thread
        const newThread = await query(
          `INSERT INTO email_threads (user_id, subject) 
           VALUES ($1, $2) RETURNING id`,
          [userId, subject]
        );
        threadId = newThread.rows[0].id;
      }

      // Store email in database
      const emailRecord = await query(
        `INSERT INTO emails (
          user_id, thread_id, from_email, to_emails, cc_emails, bcc_emails,
          subject, body_text, body_html, body_embedding, is_sent, sent_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, NOW())
        RETURNING *`,
        [
          userId,
          threadId,
          fromEmail || FROM_EMAIL,
          to,
          cc || [],
          bcc || [],
          subject,
          bodyText,
          bodyHtml,
          `[${embedding.join(',')}]`,
        ]
      );

      return {
        emailId: emailRecord.rows[0].id,
        resendId: emailData.id,
        message: 'Email sent successfully',
      };
    } catch (error: any) {
      console.error('Error sending email:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  },

  /**
   * Search emails using semantic search with pgvector
   */
  async searchEmails(userId: number, query: string, limit: number = 20): Promise<any[]> {
    try {
      // Generate query embedding
      const queryEmbedding = await cohereService.generateQueryEmbedding(query);

      // Perform vector similarity search
      const results = await query(
        `SELECT 
          e.id,
          e.from_email,
          e.from_name,
          e.to_emails,
          e.subject,
          e.body_text,
          e.is_read,
          e.sent_at,
          e.received_at,
          e.thread_id,
          1 - (e.body_embedding <=> $2::vector) as similarity
        FROM emails e
        WHERE e.user_id = $1
        ORDER BY e.body_embedding <=> $2::vector
        LIMIT $3`,
        [userId, `[${queryEmbedding.join(',')}]`, limit]
      );

      return results.rows;
    } catch (error: any) {
      console.error('Error searching emails:', error);
      throw new Error(`Failed to search emails: ${error.message}`);
    }
  },

  /**
   * Get inbox emails for a user
   */
  async getInbox(
    userId: number,
    page: number = 1,
    limit: number = 50,
    unreadOnly: boolean = false
  ): Promise<any> {
    try {
      const offset = (page - 1) * limit;
      const whereClause = unreadOnly ? 'AND e.is_read = false' : '';

      const results = await query(
        `SELECT 
          e.id,
          e.from_email,
          e.from_name,
          e.to_emails,
          e.subject,
          e.body_text,
          e.is_read,
          e.is_sent,
          e.sent_at,
          e.received_at,
          e.thread_id,
          t.subject as thread_subject,
          (SELECT COUNT(*) FROM emails WHERE thread_id = e.thread_id) as thread_count
        FROM emails e
        LEFT JOIN email_threads t ON e.thread_id = t.id
        WHERE e.user_id = $1 ${whereClause}
        ORDER BY e.received_at DESC
        LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      const countResult = await query(
        `SELECT COUNT(*) as total FROM emails WHERE user_id = $1 ${whereClause}`,
        [userId]
      );

      return {
        emails: results.rows,
        total: parseInt(countResult.rows[0].total),
        page,
        limit,
        totalPages: Math.ceil(countResult.rows[0].total / limit),
      };
    } catch (error: any) {
      console.error('Error getting inbox:', error);
      throw new Error(`Failed to get inbox: ${error.message}`);
    }
  },

  /**
   * Mark an email as read/unread
   */
  async markAsRead(userId: number, emailId: number, isRead: boolean = true): Promise<void> {
    try {
      const result = await query(
        `UPDATE emails SET is_read = $1 WHERE id = $2 AND user_id = $3 RETURNING id`,
        [isRead, emailId, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('Email not found or access denied');
      }
    } catch (error: any) {
      console.error('Error marking email:', error);
      throw new Error(`Failed to mark email: ${error.message}`);
    }
  },

  /**
   * Get a single email by ID
   */
  async getEmailById(userId: number, emailId: number): Promise<any> {
    try {
      const result = await query(
        `SELECT 
          e.*,
          t.subject as thread_subject
        FROM emails e
        LEFT JOIN email_threads t ON e.thread_id = t.id
        WHERE e.id = $1 AND e.user_id = $2`,
        [emailId, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('Email not found');
      }

      return result.rows[0];
    } catch (error: any) {
      console.error('Error getting email:', error);
      throw new Error(`Failed to get email: ${error.message}`);
    }
  },
};
