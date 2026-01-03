// backend/src/routes/conversation.ts (CORRECT VERSION)
import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { conversationService } from '../services/conversationService';

const router = Router();

// Start a new conversation
router.post('/start', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const conversationId = conversationService.startConversation(req.user!.id);
    res.json({ conversationId });
  } catch (error: any) {
    console.error('Error starting conversation:', error);
    res.status(500).json({ error: error.message || 'Error starting conversation' });
  }
});

// Send message in conversation
router.post('/:conversationId/message', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { conversationId } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await conversationService.handleMessage(
      conversationId,
      message,
      req.user!.id
    );

    res.json(result);
  } catch (error: any) {
    console.error('Error handling message:', error);
    res.status(500).json({ error: error.message || 'Error processing message' });
  }
});

// Get conversation history
router.get('/:conversationId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { conversationId } = req.params;
    const conversation = conversationService.getConversation(conversationId);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ conversation });
  } catch (error: any) {
    console.error('Error getting conversation:', error);
    res.status(500).json({ error: error.message || 'Error retrieving conversation' });
  }
});

// Export conversation
router.get('/:conversationId/export', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { conversationId } = req.params;
    const transcript = await conversationService.exportConversation(conversationId);

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="conversation-${conversationId}.txt"`);
    res.send(transcript);
  } catch (error: any) {
    console.error('Error exporting conversation:', error);
    res.status(500).json({ error: error.message || 'Error exporting conversation' });
  }
});

export default router;
