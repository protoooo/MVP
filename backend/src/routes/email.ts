import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { emailBusinessService } from '../services/emailBusinessService';

const router = express.Router();

/**
 * POST /api/email/send
 * Send a new email
 */
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { to, subject, bodyText, bodyHtml, cc, bcc, fromEmail } = req.body;

    if (!to || !Array.isArray(to) || to.length === 0) {
      return res.status(400).json({ error: 'To field is required and must be an array' });
    }

    if (!subject || !bodyText) {
      return res.status(400).json({ error: 'Subject and body text are required' });
    }

    const result = await emailBusinessService.sendEmail(
      userId,
      to,
      subject,
      bodyText,
      bodyHtml,
      cc,
      bcc,
      fromEmail
    );

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Error in POST /api/email/send:', error);
    res.status(500).json({ error: error.message || 'Failed to send email' });
  }
});

/**
 * GET /api/email/inbox
 * Get inbox emails
 */
router.get('/inbox', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const unreadOnly = req.query.unreadOnly === 'true';

    const inbox = await emailBusinessService.getInbox(userId, page, limit, unreadOnly);

    res.json(inbox);
  } catch (error: any) {
    console.error('Error in GET /api/email/inbox:', error);
    res.status(500).json({ error: error.message || 'Failed to get inbox' });
  }
});

/**
 * POST /api/email/search
 * Semantic search through emails
 */
router.post('/search', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { query, limit } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' });
    }

    const results = await emailBusinessService.searchEmails(
      userId,
      query,
      limit || 20
    );

    res.json({ results });
  } catch (error: any) {
    console.error('Error in POST /api/email/search:', error);
    res.status(500).json({ error: error.message || 'Failed to search emails' });
  }
});

/**
 * PUT /api/email/:id/read
 * Mark email as read/unread
 */
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const emailId = parseInt(req.params.id);
    const { isRead } = req.body;

    if (isNaN(emailId)) {
      return res.status(400).json({ error: 'Invalid email ID' });
    }

    await emailBusinessService.markAsRead(userId, emailId, isRead !== false);

    res.json({ message: 'Email updated successfully' });
  } catch (error: any) {
    console.error('Error in PUT /api/email/:id/read:', error);
    res.status(500).json({ error: error.message || 'Failed to update email' });
  }
});

/**
 * GET /api/email/:id
 * Get a specific email
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const emailId = parseInt(req.params.id);

    if (isNaN(emailId)) {
      return res.status(400).json({ error: 'Invalid email ID' });
    }

    const email = await emailBusinessService.getEmailById(userId, emailId);

    res.json(email);
  } catch (error: any) {
    console.error('Error in GET /api/email/:id:', error);
    res.status(500).json({ error: error.message || 'Failed to get email' });
  }
});

export default router;
