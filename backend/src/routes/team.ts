import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { teamService } from '../services/teamService';

const router = express.Router();

/**
 * POST /api/team/channels
 * Create a new channel
 */
router.post('/channels', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { organizationId, name, description, isPrivate } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Channel name is required' });
    }

    const channel = await teamService.createChannel(
      userId,
      organizationId || userId, // Use userId as org if not provided
      name,
      description,
      isPrivate
    );

    res.status(201).json(channel);
  } catch (error: any) {
    console.error('Error in POST /api/team/channels:', error);
    res.status(500).json({ error: error.message || 'Failed to create channel' });
  }
});

/**
 * GET /api/team/channels
 * List channels
 */
router.get('/channels', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const organizationId = req.query.organizationId 
      ? parseInt(req.query.organizationId as string)
      : undefined;

    const channels = await teamService.listChannels(userId, organizationId);

    res.json({ channels });
  } catch (error: any) {
    console.error('Error in GET /api/team/channels:', error);
    res.status(500).json({ error: error.message || 'Failed to list channels' });
  }
});

/**
 * POST /api/team/channels/:channelId/messages
 * Send a message to a channel
 */
router.post('/channels/:channelId/messages', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const channelId = parseInt(req.params.channelId);
    if (isNaN(channelId)) {
      return res.status(400).json({ error: 'Invalid channel ID' });
    }

    const { message, attachments } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await teamService.sendMessage(
      channelId,
      userId,
      message,
      attachments
    );

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Error in POST /api/team/channels/:channelId/messages:', error);
    res.status(500).json({ error: error.message || 'Failed to send message' });
  }
});

/**
 * GET /api/team/channels/:channelId/messages
 * Get messages for a channel
 */
router.get('/channels/:channelId/messages', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const channelId = parseInt(req.params.channelId);
    if (isNaN(channelId)) {
      return res.status(400).json({ error: 'Invalid channel ID' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await teamService.getChannelMessages(channelId, page, limit);

    res.json(result);
  } catch (error: any) {
    console.error('Error in GET /api/team/channels/:channelId/messages:', error);
    res.status(500).json({ error: error.message || 'Failed to get messages' });
  }
});

/**
 * PUT /api/team/messages/:messageId
 * Update a message
 */
router.put('/messages/:messageId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const messageId = parseInt(req.params.messageId);
    if (isNaN(messageId)) {
      return res.status(400).json({ error: 'Invalid message ID' });
    }

    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await teamService.updateMessage(messageId, userId, message);

    res.json(result);
  } catch (error: any) {
    console.error('Error in PUT /api/team/messages/:messageId:', error);
    res.status(500).json({ error: error.message || 'Failed to update message' });
  }
});

/**
 * DELETE /api/team/messages/:messageId
 * Delete a message
 */
router.delete('/messages/:messageId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const messageId = parseInt(req.params.messageId);
    if (isNaN(messageId)) {
      return res.status(400).json({ error: 'Invalid message ID' });
    }

    await teamService.deleteMessage(messageId, userId);

    res.json({ message: 'Message deleted successfully' });
  } catch (error: any) {
    console.error('Error in DELETE /api/team/messages/:messageId:', error);
    res.status(500).json({ error: error.message || 'Failed to delete message' });
  }
});

/**
 * GET /api/team/channels/:channelId/events
 * Get channel events
 */
router.get('/channels/:channelId/events', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const channelId = parseInt(req.params.channelId);
    if (isNaN(channelId)) {
      return res.status(400).json({ error: 'Invalid channel ID' });
    }

    const limit = parseInt(req.query.limit as string) || 50;

    const events = await teamService.getChannelEvents(channelId, limit);

    res.json({ events });
  } catch (error: any) {
    console.error('Error in GET /api/team/channels/:channelId/events:', error);
    res.status(500).json({ error: error.message || 'Failed to get events' });
  }
});

export default router;
