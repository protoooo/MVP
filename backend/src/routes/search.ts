import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { searchService } from '../services/searchService';

const router = Router();

// Natural language search
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const result = await searchService.search(query, req.user!.id);
    res.json(result);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Error performing search' });
  }
});

// Get search suggestions
router.get('/suggestions', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const suggestions = await searchService.getSuggestions(req.user!.id);
    res.json(suggestions);
  } catch (error) {
    console.error('Get suggestions error:', error);
    res.status(500).json({ error: 'Error getting suggestions' });
  }
});

export default router;
