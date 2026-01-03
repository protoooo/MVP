import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { query } from '../config/database';
import { fileService } from '../services/fileService';

const router = Router();

// Get storage statistics
router.get('/storage', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const storage = await fileService.getStorageUsage(req.user!.id);
    res.json(storage);
  } catch (error) {
    console.error('Error getting storage stats:', error);
    res.status(500).json({ error: 'Error getting storage statistics' });
  }
});

// Get overview analytics
router.get('/overview', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const range = (req.query.range as string) || '30d';
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;

    // Total searches
    const searchesResult = await query(
      `SELECT 
         COUNT(*) as total_searches,
         COUNT(*) FILTER (WHERE searched_at > NOW() - INTERVAL '30 days') as searches_this_month
       FROM search_logs
       WHERE user_id = $1`,
      [req.user!.id]
    );

    // Top searches
    const topSearchesResult = await query(
      `SELECT query, COUNT(*) as count
       FROM search_logs
       WHERE user_id = $1 
         AND searched_at > NOW() - INTERVAL '${days} days'
       GROUP BY query
       ORDER BY count DESC
       LIMIT 10`,
      [req.user!.id]
    );

    // Upload trend by day
    const uploadTrendResult = await query(
      `SELECT 
         DATE(uploaded_at) as date,
         COUNT(*) as count
       FROM files
       WHERE user_id = $1 
         AND uploaded_at > NOW() - INTERVAL '${days} days'
       GROUP BY DATE(uploaded_at)
       ORDER BY date DESC`,
      [req.user!.id]
    );

    // Category breakdown
    const categoryResult = await query(
      `SELECT 
         COALESCE(fm.category, 'uncategorized') as category,
         COUNT(*) as count,
         SUM(f.file_size) as size
       FROM files f
       LEFT JOIN file_metadata fm ON f.id = fm.file_id
       WHERE f.user_id = $1
       GROUP BY fm.category
       ORDER BY count DESC`,
      [req.user!.id]
    );

    // Recent activity
    const recentActivityResult = await query(
      `SELECT 
         'upload' as type,
         'Uploaded ' || original_filename as description,
         uploaded_at as timestamp
       FROM files
       WHERE user_id = $1
       ORDER BY uploaded_at DESC
       LIMIT 10`,
      [req.user!.id]
    );

    res.json({
      totalSearches: parseInt(searchesResult.rows[0]?.total_searches || '0'),
      searchesThisMonth: parseInt(searchesResult.rows[0]?.searches_this_month || '0'),
      topSearches: topSearchesResult.rows,
      uploadTrend: uploadTrendResult.rows,
      categoryBreakdown: categoryResult.rows.map(row => ({
        ...row,
        size: parseInt(row.size || '0')
      })),
      recentActivity: recentActivityResult.rows,
    });
  } catch (error) {
    console.error('Error getting analytics:', error);
    res.status(500).json({ error: 'Error getting analytics' });
  }
});

// Get search analytics
router.get('/searches', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;

    const result = await query(
      `SELECT 
         DATE_TRUNC('day', searched_at) as date,
         COUNT(*) as count,
         AVG(results_count) as avg_results
       FROM search_logs
       WHERE user_id = $1 
         AND searched_at > NOW() - INTERVAL '${days} days'
       GROUP BY DATE_TRUNC('day', searched_at)
       ORDER BY date DESC`,
      [req.user!.id]
    );

    res.json({ searches: result.rows });
  } catch (error) {
    console.error('Error getting search analytics:', error);
    res.status(500).json({ error: 'Error getting search analytics' });
  }
});

// Get file type breakdown
router.get('/file-types', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      `SELECT 
         CASE 
           WHEN file_type LIKE 'image/%' THEN 'Images'
           WHEN file_type LIKE '%pdf%' THEN 'PDFs'
           WHEN file_type LIKE '%word%' OR file_type LIKE '%document%' THEN 'Documents'
           WHEN file_type LIKE '%excel%' OR file_type LIKE '%spreadsheet%' THEN 'Spreadsheets'
           ELSE 'Other'
         END as type,
         COUNT(*) as count,
         SUM(file_size) as total_size
       FROM files
       WHERE user_id = $1
       GROUP BY type
       ORDER BY count DESC`,
      [req.user!.id]
    );

    res.json({ fileTypes: result.rows });
  } catch (error) {
    console.error('Error getting file type analytics:', error);
    res.status(500).json({ error: 'Error getting file type analytics' });
  }
});

// Export analytics data
router.get('/export', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const storage = await fileService.getStorageUsage(req.user!.id);

    const filesResult = await query(
      `SELECT 
         f.original_filename,
         f.file_type,
         f.file_size,
         f.uploaded_at,
         fm.category,
         fm.tags
       FROM files f
       LEFT JOIN file_metadata fm ON f.id = fm.file_id
       WHERE f.user_id = $1
       ORDER BY f.uploaded_at DESC`,
      [req.user!.id]
    );

    const searchesResult = await query(
      `SELECT query, results_count, searched_at
       FROM search_logs
       WHERE user_id = $1
       ORDER BY searched_at DESC
       LIMIT 1000`,
      [req.user!.id]
    );

    const csvData = {
      storage,
      files: filesResult.rows,
      searches: searchesResult.rows,
      exportedAt: new Date().toISOString(),
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="analytics-${Date.now()}.json"`);
    res.json(csvData);
  } catch (error) {
    console.error('Error exporting analytics:', error);
    res.status(500).json({ error: 'Error exporting analytics' });
  }
});

export default router;
