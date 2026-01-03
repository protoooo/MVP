// backend/src/routes/search.ts - SECURE VERSION
import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { searchLimiter, apiLimiter } from '../middleware/rateLimiter';
import { searchService } from '../services/searchService';

const router = Router();

// ========================================
// Natural language search with rate limiting
// ========================================
router.post('/', authMiddleware, searchLimiter, async (req: AuthRequest, res) => {
  try {
    const { query } = req.body;

    // Validate input
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    if (typeof query !== 'string') {
      return res.status(400).json({ error: 'Query must be a string' });
    }

    if (query.trim().length === 0) {
      return res.status(400).json({ error: 'Query cannot be empty' });
    }

    if (query.length > 500) {
      return res.status(400).json({ error: 'Query too long (max 500 characters)' });
    }

    // Perform search
    console.log(`🔍 Search request from user ${req.user!.id}: "${query}"`);
    const result = await searchService.search(query, req.user!.id);
    
    res.json(result);
  } catch (error: any) {
    console.error('Search error:', error);
    res.status(500).json({ 
      error: 'Error performing search',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ========================================
// Get search suggestions
// ========================================
router.get('/suggestions', authMiddleware, apiLimiter, async (req: AuthRequest, res) => {
  try {
    const suggestions = await searchService.getSuggestions(req.user!.id);
    res.json(suggestions);
  } catch (error: any) {
    console.error('Get suggestions error:', error);
    res.status(500).json({ 
      error: 'Error getting suggestions',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
